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

// GET /api/therapy/sessions - Get all therapy sessions for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await prisma.therapySession.findMany({
      where: { userId: user.id },
      include: {
        goals: {
          select: {
            id: true,
            title: true,
            isCompleted: true,
            priority: true
          }
        },
        exercises: {
          select: {
            id: true,
            title: true,
            isCompleted: true,
            exerciseType: true
          }
        },
        _count: {
          select: {
            goals: true,
            exercises: true,
            chatMessages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching therapy sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/therapy/sessions - Create a new therapy session
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { primaryConcern, therapyGoal, therapyStyle, sessionType } = body;

    // Validate required fields
    if (!primaryConcern || !primaryConcern.trim()) {
      return NextResponse.json({ error: 'Primary concern is required' }, { status: 400 });
    }

    // Generate a unique thread ID for LangGraph
    const threadId = `therapy_${user.id}_${Date.now()}`;

    const session = await prisma.therapySession.create({
      data: {
        userId: user.id,
        threadId,
        primaryConcern: primaryConcern.trim(),
        therapyGoal: therapyGoal?.trim() || null,
        therapyStyle: therapyStyle || 'cognitive-behavioral',
        sessionType: sessionType || 'assessment',
        status: 'active',
        progressLevel: 0.00
      },
      include: {
        goals: true,
        exercises: true,
        _count: {
          select: {
            goals: true,
            exercises: true,
            chatMessages: true
          }
        }
      }
    });

    console.log(`📝 Created new therapy session: ${session.id} for user: ${user.email}`);

    return NextResponse.json({ 
      session,
      message: 'Therapy session created successfully'
    });
  } catch (error) {
    console.error('Error creating therapy session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 