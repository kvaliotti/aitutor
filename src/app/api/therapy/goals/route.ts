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

// GET /api/therapy/goals?sessionId=xxx - Get goals for a therapy session
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

    const goals = await prisma.therapyGoal.findMany({
      where: { 
        sessionId,
        isActive: true 
      },
      include: {
        subGoals: {
          where: { isActive: true },
          orderBy: { priority: 'asc' }
        },
        exercises: {
          select: {
            id: true,
            title: true,
            isCompleted: true,
            exerciseType: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error fetching therapy goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/therapy/goals - Update goal completion status
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, isCompleted } = body;

    if (!goalId || typeof isCompleted !== 'boolean') {
      return NextResponse.json({ 
        error: 'Goal ID and completion status are required' 
      }, { status: 400 });
    }

    // Verify the goal belongs to a session owned by the user
    const goal = await prisma.therapyGoal.findFirst({
      where: { 
        id: goalId,
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

    if (!goal) {
      return NextResponse.json({ 
        error: 'Therapy goal not found or access denied' 
      }, { status: 404 });
    }

    // Update the goal
    const updatedGoal = await prisma.therapyGoal.update({
      where: { id: goalId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    // Create progress history record
    await prisma.therapyProgressHistory.create({
      data: {
        userId: user.id,
        sessionId: goal.session.id,
        goalId: goalId,
        progressType: isCompleted ? 'goal_completed' : 'goal_updated',
        progressValue: isCompleted ? 100 : 0,
        notes: `Goal "${goal.title}" ${isCompleted ? 'completed' : 'marked incomplete'} by user`
      }
    });

    // Update session progress level
    const allGoals = await prisma.therapyGoal.findMany({
      where: { sessionId: goal.session.id, isActive: true },
      select: { isCompleted: true }
    });

    const completedCount = allGoals.filter(g => g.isCompleted).length;
    const progressLevel = allGoals.length > 0 ? (completedCount / allGoals.length) * 100 : 0;

    await prisma.therapySession.update({
      where: { id: goal.session.id },
      data: { 
        progressLevel,
        status: progressLevel === 100 ? 'completed' : 'active',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      goal: updatedGoal,
      message: `Goal ${isCompleted ? 'completed' : 'updated'} successfully`,
      sessionProgress: progressLevel
    });
  } catch (error) {
    console.error('Error updating therapy goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 