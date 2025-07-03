import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatWithCBTAgent } from '@/lib/agents/cbt-orchestration';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

// Helper function to get user from JWT token
async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });

    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// POST /api/therapy/chat - Handle chat messages with CBT agents
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    // Validate required fields
    if (!sessionId || !message || !message.trim()) {
      return NextResponse.json({ 
        error: 'Session ID and message are required' 
      }, { status: 400 });
    }

    // Verify the therapy session belongs to the user
    const session = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        userId: user.id
      },
      select: {
        id: true,
        threadId: true,
        primaryConcern: true,
        status: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Therapy session not found or access denied' 
      }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ 
        error: 'This therapy session is not active' 
      }, { status: 400 });
    }

    console.log(`🧠 Processing therapy chat for session: ${sessionId}`);
    console.log(`🧠 User message: ${message.substring(0, 100)}...`);

    // Use the CBT dual-agent orchestration system
    const result = await chatWithCBTAgent(
      sessionId,
      user.id,
      message.trim(),
      session.threadId
    );

    if (!result.success) {
      console.error('CBT Agent Error:', result.error);
      return NextResponse.json({ 
        error: 'Error processing your message. Please try again.' 
      }, { status: 500 });
    }

    // Update session's updatedAt timestamp
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    console.log(`🧠 Therapy chat response generated successfully for session: ${sessionId}`);

    return NextResponse.json({
      response: result.response,
      success: true
    });

  } catch (error) {
    console.error('Error in therapy chat API:', error);
    return NextResponse.json({ 
      error: 'Internal server error. If you\'re in crisis, please contact emergency services immediately.' 
    }, { status: 500 });
  }
}

// GET /api/therapy/chat?sessionId=xxx - Get chat history for a therapy session
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    // Verify the therapy session belongs to the user
    const session = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        userId: user.id
      },
      select: { id: true }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Therapy session not found or access denied' 
      }, { status: 404 });
    }

    // Get chat messages for this session
    const messages = await prisma.therapyChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        agentType: true,
        createdAt: true
      }
    });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching therapy chat history:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 