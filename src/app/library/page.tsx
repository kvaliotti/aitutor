'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';

// Updated data structures to match the new API response
interface Concept {
  id: string;
  name: string;
  isCompleted: boolean;
}

interface LibraryCategory {
  id: number;
  name: string;
  icon: string;
  concepts: Concept[];
  conceptCount: number;
  completedCount: number;
}

interface LibraryStats {
    totalConcepts: number;
    completedConcepts: number;
  completionRate: number;
    currentLevel: number;
    currentLevelName: string;
    progressToNext: number;
}

interface LibraryData {
  stats: LibraryStats;
  categories: LibraryCategory[];
}

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; createdAt: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userResponse, libraryResponse] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/library/overview'),
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
        }

        if (!libraryResponse.ok) {
          throw new Error('Failed to load library data');
        }

        const libraryData = await libraryResponse.json();
      setData(libraryData);

        if (libraryData.categories && libraryData.categories.length > 0) {
          setActiveCategory(libraryData.categories[0].id);
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

    fetchData();
  }, []);

  const handleCategoryToggle = (categoryId: number) => {
    setActiveCategory(prev => (prev === categoryId ? null : categoryId));
  };

  if (isLoading) {
    // ... (Skeleton loader can be kept, but simplified)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // ... (Error state can be kept as is)
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-4">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Library is Empty</h2>
          <p className="text-gray-600 mb-6">
            Start a new learning session with the AI Tutor to begin building your personal knowledge library.
          </p>
            <Link
              href="/tutor"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Learning
            </Link>
        </div>
      </div>
    );
  }

  const { stats, categories } = data;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} variant="full" />
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-800">My Library</h1>
          <p className="text-gray-600 mt-1">A personalized collection of your learned concepts.</p>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800">Learning Level</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.currentLevelName} <span className="text-lg">({stats.currentLevel})</span></p>
              <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.progressToNext}%` }}></div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-800">Concepts Completed</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedConcepts} / {stats.totalConcepts}</p>
              <div className="w-full bg-green-100 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.completionRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {categories.map((category) => (
            <div key={category.id} className="border-b last:border-b-0">
              <button
                onClick={() => handleCategoryToggle(category.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 focus:outline-none"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-4">{category.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{category.name}</h2>
                    <p className="text-sm text-gray-500">{category.completedCount} / {category.conceptCount} concepts completed</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transform transition-transform ${
                    activeCategory === category.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeCategory === category.id && (
                <div className="bg-gray-50 p-4">
                  <ul className="space-y-2">
                    {category.concepts.map(concept => (
                      <li key={concept.id} className="flex items-center text-gray-700">
                        <span className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${concept.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                          {concept.isCompleted && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {concept.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 