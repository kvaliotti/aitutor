import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// Helper function to calculate user's learning level
const calculateUserLevel = (completedConcepts: number) => {
  const levels = [
    { min: 0, max: 9, level: 1, name: 'Beginner' },
    { min: 10, max: 24, level: 2, name: 'Learning' },
    { min: 25, max: 49, level: 3, name: 'Progressing' },
    { min: 50, max: 99, level: 4, name: 'Advanced' },
    { min: 100, max: 199, level: 5, name: 'Expert' },
    { min: 200, max: Infinity, level: 6, name: 'Master' },
  ];
  
  const currentLevel = levels.find(l => completedConcepts >= l.min && completedConcepts <= l.max)!;
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  
  return {
    currentLevel: currentLevel.level,
    currentLevelName: currentLevel.name,
    progressToNext: nextLevel ? Math.round(((completedConcepts - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100) : 100,
  };
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token.value, process.env.NEXTAUTH_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Simplified data fetching
    const [totalConceptsCount, completedConceptsCount, categoriesWithConcepts] = await Promise.all([
      prisma.concept.count({ where: { session: { userId } } }),
      prisma.concept.count({ where: { session: { userId }, isCompleted: true } }),
      prisma.subjectCategory.findMany({
        where: {
          learningSessions: {
            some: {
              userId: userId,
              concepts: { some: {} },
            },
          },
        },
        select: {
          id: true,
          name: true,
          icon: true,
          learningSessions: {
            where: { userId: userId },
            select: {
              concepts: {
                select: {
                  id: true,
                  name: true,
                  isCompleted: true,
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
            },
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
      }),
    ]);

    // Process categories to flatten concepts
    const libraryCategories = categoriesWithConcepts.map(category => {
      const concepts = category.learningSessions.flatMap(session => session.concepts);
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        concepts: concepts,
        conceptCount: concepts.length,
        completedCount: concepts.filter(c => c.isCompleted).length,
      };
    }).filter(category => category.concepts.length > 0);

    const levelInfo = calculateUserLevel(completedConceptsCount);

    const responseData = {
      stats: {
        totalConcepts: totalConceptsCount,
        completedConcepts: completedConceptsCount,
        completionRate: totalConceptsCount > 0 ? Math.round((completedConceptsCount / totalConceptsCount) * 100) : 0,
        ...levelInfo,
      },
      categories: libraryCategories,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Library overview API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library overview' },
      { status: 500 }
    );
  }
} 