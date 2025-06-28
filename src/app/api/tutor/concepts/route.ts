import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tutor/concepts?sessionId=xxx - Get concepts for a specific session
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

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

    const concepts = await prisma.concept.findMany({
      where: { sessionId },
      include: {
        subConcepts: {
          orderBy: { orderIndex: 'asc' },
          include: {
            subConcepts: true // Include nested sub-concepts
          }
        },
        tasks: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Build hierarchical structure (root concepts only, sub-concepts are included)
    const rootConcepts = concepts.filter(concept => !concept.parentConceptId);

    return NextResponse.json({ concepts: rootConcepts, sessionId });
  } catch (error) {
    console.error('Error fetching concepts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tutor/concepts - Create new concepts for a session
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, concepts } = body;

    if (!sessionId || !concepts || !Array.isArray(concepts)) {
      return NextResponse.json({ 
        error: 'Session ID and concepts array are required' 
      }, { status: 400 });
    }

    // Verify the session belongs to the user
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create concepts in a transaction to maintain consistency
    const result = await prisma.$transaction(async (tx) => {
      const createdConcepts = [];
      
      for (const conceptData of concepts) {
        const { name, description, parentConceptId, orderIndex } = conceptData;
        
        if (!name || orderIndex === undefined) {
          throw new Error('Concept name and orderIndex are required');
        }

        // If parentConceptId is provided, verify it exists and belongs to the same session
        if (parentConceptId) {
          const parentConcept = await tx.concept.findFirst({
            where: { id: parentConceptId, sessionId }
          });
          
          if (!parentConcept) {
            throw new Error(`Parent concept ${parentConceptId} not found`);
          }
        }

        const concept = await tx.concept.create({
          data: {
            sessionId,
            name: name.trim(),
            description: description?.trim() || null,
            parentConceptId: parentConceptId || null,
            orderIndex,
            isCompleted: false
          },
          include: {
            tasks: true
          }
        });

        createdConcepts.push(concept);
      }

      return createdConcepts;
    });

    return NextResponse.json({ concepts: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating concepts:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT /api/tutor/concepts - Update concept completion status
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conceptId, isCompleted, sessionId } = body;

    if (!conceptId || isCompleted === undefined) {
      return NextResponse.json({ 
        error: 'Concept ID and completion status are required' 
      }, { status: 400 });
    }

    // Verify the concept belongs to a session owned by the user
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        session: {
          userId: user.id
        }
      },
      include: {
        session: true
      }
    });

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const updatedConcept = await prisma.concept.update({
      where: { id: conceptId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null
      },
      include: {
        tasks: true,
        subConcepts: true
      }
    });

    // Update session completion rate if sessionId is provided
    if (sessionId) {
      await updateSessionCompletionRate(sessionId);
    }

    return NextResponse.json({ concept: updatedConcept });
  } catch (error) {
    console.error('Error updating concept:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate and update session completion rate
async function updateSessionCompletionRate(sessionId: string) {
  try {
    const concepts = await prisma.concept.findMany({
      where: { sessionId },
      select: { isCompleted: true }
    });

    if (concepts.length === 0) return;

    const completedCount = concepts.filter(c => c.isCompleted).length;
    const completionRate = (completedCount / concepts.length) * 100;

    await prisma.learningSession.update({
      where: { id: sessionId },
      data: { 
        completionRate,
        status: completionRate === 100 ? 'completed' : 'active',
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating session completion rate:', error);
  }
} 