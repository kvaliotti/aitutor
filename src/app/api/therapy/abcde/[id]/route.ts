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

// GET /api/therapy/abcde/[id] - Get specific ABCDE exercise with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exerciseId = params.id;

    // Get ABCDE exercise with related data
    const exercise = await prisma.aBCDEExercise.findFirst({
      where: {
        id: exerciseId,
        userId
      },
      include: {
        session: {
          select: {
            id: true,
            primaryConcern: true,
            therapyGoal: true,
            therapyStyle: true,
            createdAt: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'ABCDE exercise not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get related ABCDE exercises from the same session
    const relatedExercises = await prisma.aBCDEExercise.findMany({
      where: {
        sessionId: exercise.sessionId,
        userId,
        id: { not: exerciseId }
      },
      select: {
        id: true,
        title: true,
        completionStatus: true,
        createdAt: true,
        completedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get progress history for this exercise
    const progressHistory = await prisma.therapyProgressHistory.findMany({
      where: {
        userId,
        notes: {
          contains: exercise.title
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      exercise,
      relatedExercises,
      progressHistory,
      metadata: {
        sessionConcern: exercise.session.primaryConcern,
        therapyStyle: exercise.session.therapyStyle,
        completionPercentage: exercise.completionStatus === 'completed' ? 100 :
                              exercise.completionStatus === 'in_progress' ? 50 : 0,
        timeSpent: exercise.completedAt && exercise.createdAt ? 
                  Math.ceil((exercise.completedAt.getTime() - exercise.createdAt.getTime()) / (1000 * 60)) : null
      }
    });

  } catch (error) {
    console.error('Error fetching ABCDE exercise:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ABCDE exercise' },
      { status: 500 }
    );
  }
}

// PUT /api/therapy/abcde/[id] - Update specific ABCDE exercise
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exerciseId = params.id;
    const body = await request.json();
    const {
      title,
      activatingEvent,
      beliefs,
      consequences,
      disputation,
      effectiveBeliefs,
      completionStatus
    } = body;

    // Verify exercise exists and belongs to user
    const existingExercise = await prisma.aBCDEExercise.findFirst({
      where: {
        id: exerciseId,
        userId
      },
      include: {
        session: true
      }
    });

    if (!existingExercise) {
      return NextResponse.json(
        { error: 'ABCDE exercise not found or unauthorized' },
        { status: 404 }
      );
    }

    // Determine completion status if not explicitly provided
    let finalCompletionStatus = completionStatus;
    if (!finalCompletionStatus) {
      const hasAllRequired = title && activatingEvent && beliefs && consequences;
      const hasOptional = disputation && effectiveBeliefs;
      
      if (hasAllRequired && hasOptional) {
        finalCompletionStatus = 'completed';
      } else if (hasAllRequired) {
        finalCompletionStatus = 'in_progress';
      } else {
        finalCompletionStatus = existingExercise.completionStatus;
      }
    }

    // Update the exercise
    const updatedExercise = await prisma.aBCDEExercise.update({
      where: { id: exerciseId },
      data: {
        title: title || existingExercise.title,
        activatingEvent: activatingEvent || existingExercise.activatingEvent,
        beliefs: beliefs || existingExercise.beliefs,
        consequences: consequences || existingExercise.consequences,
        disputation: disputation !== undefined ? disputation : existingExercise.disputation,
        effectiveBeliefs: effectiveBeliefs !== undefined ? effectiveBeliefs : existingExercise.effectiveBeliefs,
        completionStatus: finalCompletionStatus,
        completedAt: finalCompletionStatus === 'completed' && !existingExercise.completedAt ? 
                    new Date() : existingExercise.completedAt,
        updatedAt: new Date()
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

    // Create progress history record for the update
    const progressValue = finalCompletionStatus === 'completed' ? 100 :
                         finalCompletionStatus === 'in_progress' ? 50 : 0;

    await prisma.therapyProgressHistory.create({
      data: {
        userId,
        sessionId: existingExercise.sessionId,
        progressType: 'abcde_exercise_updated',
        progressValue,
        notes: `ABCDE exercise "${updatedExercise.title}" updated via API - Status: ${finalCompletionStatus}`
      }
    });

    return NextResponse.json({
      exercise: updatedExercise,
      message: `ABCDE exercise "${updatedExercise.title}" updated successfully`,
      changes: {
        statusChanged: existingExercise.completionStatus !== finalCompletionStatus,
        previousStatus: existingExercise.completionStatus,
        newStatus: finalCompletionStatus
      }
    });

  } catch (error) {
    console.error('Error updating ABCDE exercise:', error);
    return NextResponse.json(
      { error: 'Failed to update ABCDE exercise' },
      { status: 500 }
    );
  }
}

// DELETE /api/therapy/abcde/[id] - Delete specific ABCDE exercise (optional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exerciseId = params.id;

    // Verify exercise exists and belongs to user
    const exercise = await prisma.aBCDEExercise.findFirst({
      where: {
        id: exerciseId,
        userId
      }
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'ABCDE exercise not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the exercise (this will cascade to related progress history)
    await prisma.aBCDEExercise.delete({
      where: { id: exerciseId }
    });

    return NextResponse.json({
      message: `ABCDE exercise "${exercise.title}" deleted successfully`,
      deletedExercise: {
        id: exercise.id,
        title: exercise.title
      }
    });

  } catch (error) {
    console.error('Error deleting ABCDE exercise:', error);
    return NextResponse.json(
      { error: 'Failed to delete ABCDE exercise' },
      { status: 500 }
    );
  }
} 