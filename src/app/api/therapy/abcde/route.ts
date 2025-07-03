import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token and get user ID
async function getUserFromToken(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// GET /api/therapy/abcde - Retrieve ABCDE exercises for a user/session
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status'); // 'completed', 'in_progress', 'abandoned'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = { userId };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }
    if (status) {
      whereClause.completionStatus = status;
    }

    // Get ABCDE exercises with session info
    const exercises = await prisma.aBCDEExercise.findMany({
      where: whereClause,
      include: {
        session: {
          select: {
            id: true,
            primaryConcern: true,
            therapyStyle: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.aBCDEExercise.count({
      where: whereClause
    });

    // Calculate statistics
    const stats = await prisma.aBCDEExercise.groupBy({
      by: ['completionStatus'],
      where: { userId },
      _count: {
        completionStatus: true
      }
    });

    const completedCount = stats.find(s => s.completionStatus === 'completed')?._count.completionStatus || 0;
    const inProgressCount = stats.find(s => s.completionStatus === 'in_progress')?._count.completionStatus || 0;
    const abandonedCount = stats.find(s => s.completionStatus === 'abandoned')?._count.completionStatus || 0;

    return NextResponse.json({
      exercises,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        total: totalCount,
        completed: completedCount,
        inProgress: inProgressCount,
        abandoned: abandonedCount,
        completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
      }
    });

  } catch (error) {
    console.error('Error fetching ABCDE exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ABCDE exercises' },
      { status: 500 }
    );
  }
}

// POST /api/therapy/abcde - Create a new ABCDE exercise (for testing/manual creation)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      title,
      activatingEvent,
      beliefs,
      consequences,
      disputation,
      effectiveBeliefs
    } = body;

    // Validate required fields
    if (!sessionId || !title || !activatingEvent || !beliefs || !consequences) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, title, activatingEvent, beliefs, consequences' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Determine completion status
    const isComplete = disputation && effectiveBeliefs;
    const completionStatus = isComplete ? 'completed' : 'in_progress';

    // Create ABCDE exercise
    const exercise = await prisma.aBCDEExercise.create({
      data: {
        userId,
        sessionId,
        title,
        activatingEvent,
        beliefs,
        consequences,
        disputation: disputation || null,
        effectiveBeliefs: effectiveBeliefs || null,
        completionStatus,
        completedAt: isComplete ? new Date() : null
      },
      include: {
        session: {
          select: {
            id: true,
            primaryConcern: true,
            therapyStyle: true
          }
        }
      }
    });

    // Create progress history record
    await prisma.therapyProgressHistory.create({
      data: {
        userId,
        sessionId,
        progressType: 'abcde_exercise_completed',
        progressValue: isComplete ? 100 : 50,
        notes: `ABCDE exercise "${title}" created via API: ${activatingEvent.substring(0, 100)}...`
      }
    });

    return NextResponse.json({
      exercise,
      message: `ABCDE exercise "${title}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ABCDE exercise:', error);
    return NextResponse.json(
      { error: 'Failed to create ABCDE exercise' },
      { status: 500 }
    );
  }
} 