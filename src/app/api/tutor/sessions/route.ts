import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// GET /api/tutor/sessions - Get all sessions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await prisma.learningSession.findMany({
      where: { userId: user.id },
      include: {
        concepts: {
          orderBy: { orderIndex: 'asc' }
        },
        tasks: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            concepts: true,
            tasks: true,
            chatMessages: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tutor/sessions - Create a new learning session
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, goal, teachingStyle = 'step-by-step', responseStyle = 'detailed' } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Goal is optional but should be reasonable length if provided
    if (goal && goal.trim().length > 500) {
      return NextResponse.json({ error: 'Goal must be under 500 characters' }, { status: 400 });
    }

    const validTeachingStyles = ['socratic', 'step-by-step', 'discovery-based'];
    if (!validTeachingStyles.includes(teachingStyle)) {
      return NextResponse.json({ error: 'Invalid teaching style' }, { status: 400 });
    }

    const validResponseStyles = ['concise', 'detailed'];
    if (!validResponseStyles.includes(responseStyle)) {
      return NextResponse.json({ error: 'Invalid response style' }, { status: 400 });
    }

    const threadId = uuidv4();

    const session = await prisma.learningSession.create({
      data: {
        userId: user.id,
        threadId,
        topic: topic.trim(),
        goal: goal ? goal.trim() : null,
        teachingStyle,
        responseStyle,
        status: 'active',
        completionRate: 0.00
      },
      include: {
        concepts: true,
        tasks: true
      }
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tutor/sessions - Update a learning session
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, teachingStyle, responseStyle, status, completionRate } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const existingSession = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (teachingStyle) {
      const validTeachingStyles = ['socratic', 'step-by-step', 'discovery-based'];
      if (!validTeachingStyles.includes(teachingStyle)) {
        return NextResponse.json({ error: 'Invalid teaching style' }, { status: 400 });
      }
      updateData.teachingStyle = teachingStyle;
    }

    if (responseStyle) {
      const validResponseStyles = ['concise', 'detailed'];
      if (!validResponseStyles.includes(responseStyle)) {
        return NextResponse.json({ error: 'Invalid response style' }, { status: 400 });
      }
      updateData.responseStyle = responseStyle;
    }

    if (status) {
      const validStatuses = ['active', 'completed', 'paused'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (completionRate !== undefined) {
      if (completionRate < 0 || completionRate > 100) {
        return NextResponse.json({ error: 'Completion rate must be between 0 and 100' }, { status: 400 });
      }
      updateData.completionRate = completionRate;
    }

    updateData.updatedAt = new Date();

    const session = await prisma.learningSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        concepts: {
          orderBy: { orderIndex: 'asc' }
        },
        tasks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 