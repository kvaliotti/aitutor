import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// GET /api/therapy/exercises?sessionId=xxx - Get exercises for a therapy session
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

    const exercises = await prisma.therapyExercise.findMany({
      where: { sessionId },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error('Error fetching therapy exercises:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/therapy/exercises - Update exercise completion status
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exerciseId, isCompleted, feedback } = body;

    if (!exerciseId || typeof isCompleted !== 'boolean') {
      return NextResponse.json({ 
        error: 'Exercise ID and completion status are required' 
      }, { status: 400 });
    }

    // Verify the exercise belongs to a session owned by the user
    const exercise = await prisma.therapyExercise.findFirst({
      where: { 
        id: exerciseId,
        session: {
          userId: user.id
        }
      },
      include: {
        session: {
          select: { id: true, userId: true }
        }
      }
    });

    if (!exercise) {
      return NextResponse.json({ 
        error: 'Therapy exercise not found or access denied' 
      }, { status: 404 });
    }

    // Update the exercise
    const updatedExercise = await prisma.therapyExercise.update({
      where: { id: exerciseId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        feedback: feedback || exercise.feedback // Keep existing feedback if not provided
      }
    });

    // Create progress history record
    await prisma.therapyProgressHistory.create({
      data: {
        userId: user.id,
        sessionId: exercise.session.id,
        progressType: 'exercise_completed',
        progressValue: isCompleted ? 100 : 0,
        notes: `Exercise "${exercise.title}" ${isCompleted ? 'completed' : 'marked incomplete'} by user${feedback ? ` with feedback: ${feedback}` : ''}`
      }
    });

    return NextResponse.json({ 
      exercise: updatedExercise,
      message: `Exercise ${isCompleted ? 'completed' : 'updated'} successfully`
    });
  } catch (error) {
    console.error('Error updating therapy exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 