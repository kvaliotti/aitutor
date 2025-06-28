import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tutor/tasks?sessionId=xxx - Get tasks for a specific session
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const conceptId = url.searchParams.get('conceptId');

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

    const whereClause: any = { sessionId };
    if (conceptId) {
      whereClause.conceptId = conceptId;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tasks, sessionId });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tutor/tasks - Create new tasks
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, tasks } = body;

    if (!sessionId || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ 
        error: 'Session ID and tasks array are required' 
      }, { status: 400 });
    }

    // Verify the session belongs to the user
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create tasks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdTasks = [];
      
      for (const taskData of tasks) {
        const { title, description, conceptId } = taskData;
        
        if (!title || !description) {
          throw new Error('Task title and description are required');
        }

        // If conceptId is provided, verify it exists and belongs to the same session
        if (conceptId) {
          const concept = await tx.concept.findFirst({
            where: { id: conceptId, sessionId }
          });
          
          if (!concept) {
            throw new Error(`Concept ${conceptId} not found`);
          }
        }

        const task = await tx.task.create({
          data: {
            sessionId,
            conceptId: conceptId || null,
            title: title.trim(),
            description: description.trim(),
            isCompleted: false
          },
          include: {
            concept: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        });

        createdTasks.push(task);
      }

      return createdTasks;
    });

    return NextResponse.json({ tasks: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating tasks:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT /api/tutor/tasks - Update task completion status
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, isCompleted } = body;

    if (!taskId || isCompleted === undefined) {
      return NextResponse.json({ 
        error: 'Task ID and completion status are required' 
      }, { status: 400 });
    }

    // Verify the task belongs to a session owned by the user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        session: {
          userId: user.id
        }
      },
      include: {
        session: true,
        concept: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tutor/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify the task belongs to a session owned by the user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        session: {
          userId: user.id
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 