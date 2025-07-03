import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { chatWithAgent } from '@/lib/agents';

export const maxDuration = 60; // Set timeout to 60 seconds

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }); // 60 seconds
    return true;
  }
  
  if (now > limit.resetTime) {
    // Reset the limit
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 60) { // 60 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

// GET /api/tutor/chat?sessionId=xxx - Get chat history for a session
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: Math.min(limit, 100), // Max 100 messages per request
      skip: offset
    });

    return NextResponse.json({ 
      messages, 
      sessionId,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tutor/chat - Send a message to the AI tutor
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a minute before sending more messages.' 
      }, { status: 429 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    console.log('Chat POST request:', { sessionId, messageLength: message?.length, userId: user.id });

    if (!sessionId || !message || message.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Session ID and message are required' 
      }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ 
        error: 'Message too long. Please keep messages under 1000 characters.' 
      }, { status: 400 });
    }

    console.log('Looking for session:', { sessionId, userId: user.id });
    
    // Verify the session belongs to the user
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      console.error('Session not found in database:', { sessionId, userId: user.id });
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    console.log('Found session:', { 
      id: session.id, 
      topic: session.topic, 
      threadId: session.threadId 
    });

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured. Please contact administrator.' 
      }, { status: 503 });
    }

    try {
      // Chat with the AI agent
      const agentResponse = await chatWithAgent(
        sessionId,
        user.id,
        message.trim(),
        session.threadId
      );

      if (!agentResponse.success) {
        return NextResponse.json({ 
          error: 'AI tutor is temporarily unavailable. Please try again.' 
        }, { status: 503 });
      }

      // Handle response (now always combined)
      // Get updated session data with latest concepts and tasks
      const updatedSession = await prisma.learningSession.findFirst({
        where: { id: sessionId },
        include: {
          concepts: {
            orderBy: { orderIndex: 'asc' },
            include: { subConcepts: true }
          },
          tasks: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Latest 10 tasks
          }
        }
      });

      return NextResponse.json({
        message: agentResponse.response,
        sessionId,
        concepts: updatedSession?.concepts || [],
        tasks: updatedSession?.tasks || [],
        completionRate: updatedSession?.completionRate || 0
      });

    } catch (agentError) {
      console.error('Agent error:', agentError);
      
      // Fallback response
      return NextResponse.json({
        message: "I'm having trouble processing your request right now. Let me save your message and you can try again in a moment.",
        sessionId,
        error: 'Agent temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tutor/chat - Update teaching style for the session
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, teachingStyle } = body;

    if (!sessionId || !teachingStyle) {
      return NextResponse.json({ 
        error: 'Session ID and teaching style are required' 
      }, { status: 400 });
    }

    const validTeachingStyles = ['socratic', 'step-by-step', 'discovery-based'];
    if (!validTeachingStyles.includes(teachingStyle)) {
      return NextResponse.json({ error: 'Invalid teaching style' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update the teaching style
    const updatedSession = await prisma.learningSession.update({
      where: { id: sessionId },
      data: { 
        teachingStyle,
        updatedAt: new Date()
      }
    });

    // Add a system message about the style change
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `Teaching style updated to ${teachingStyle}. I'll adjust my approach accordingly.`,
        metadata: {
          type: 'system',
          action: 'teaching_style_change',
          newStyle: teachingStyle
        }
      }
    });

    return NextResponse.json({ 
      session: updatedSession,
      message: `Teaching style updated to ${teachingStyle}`
    });

  } catch (error) {
    console.error('Error updating teaching style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 