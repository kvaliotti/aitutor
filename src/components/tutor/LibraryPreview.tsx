'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LibraryStats {
  totalConcepts: number;
  completedConcepts: number;
  currentLevel: number;
  currentStreak: number;
  recentAchievements: number;
}

interface RecentConcept {
  id: string;
  name: string;
  sessionTopic: string;
  completedAt: string;
  category: string;
}

export function LibraryPreview() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [recentConcepts, setRecentConcepts] = useState<RecentConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadLibraryPreview();
  }, []);

  const loadLibraryPreview = async () => {
    try {
      const response = await fetch('/api/library/overview');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalConcepts: data.stats?.totalConcepts || 0,
          completedConcepts: data.stats?.completedConcepts || 0,
          currentLevel: data.stats?.currentLevel || 1,
          currentStreak: data.stats?.currentStreak || 0,
          recentAchievements: data.achievements?.length || 0
        });
        
        // Get first 3 recent concepts
        setRecentConcepts(data.recentActivity?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Error loading library preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const completedAt = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const getLevelInfo = (level: number) => {
    const levels = [
      { name: 'Beginner', emoji: '🌱', color: 'text-green-600' },
      { name: 'Learning', emoji: '📚', color: 'text-blue-600' },
      { name: 'Progressing', emoji: '🎯', color: 'text-purple-600' },
      { name: 'Advanced', emoji: '🚀', color: 'text-indigo-600' },
      { name: 'Expert', emoji: '⭐', color: 'text-yellow-600' },
      { name: 'Master', emoji: '👑', color: 'text-orange-600' }
    ];
    return levels[Math.min(level - 1, levels.length - 1)];
  };

  if (isLoading) {
    return (
      <div className="p-3">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelInfo(stats?.currentLevel || 1);
  const completionRate = stats ? Math.round((stats.completedConcepts / Math.max(stats.totalConcepts, 1)) * 100) : 0;

  return (
    <div className="border-b border-gray-200">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📚</span>
            Personal Library
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-xs text-gray-600">Progress</div>
            <div className="text-sm font-semibold text-gray-900">{completionRate}%</div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-xs text-gray-600">Level</div>
            <div className={`text-sm font-semibold ${levelInfo.color}`}>
              {levelInfo.emoji} {levelInfo.name}
            </div>
          </div>
        </div>

        {/* Current Streak */}
        {stats && stats.currentStreak > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-orange-700">Current Streak</div>
              <div className="text-sm font-bold text-orange-600">
                🔥 {stats.currentStreak} days
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link
            href="/library"
            className="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded font-medium hover:bg-blue-700 transition-colors text-center"
          >
            View Library
          </Link>
          <Link
            href="/library/achievements"
            className="bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded font-medium hover:bg-gray-200 transition-colors"
          >
            🏆
          </Link>
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Recent Concepts */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Recently Learned
            </div>
            {recentConcepts.length > 0 ? (
              <div className="space-y-2">
                {recentConcepts.map((concept) => (
                  <div key={concept.id} className="bg-gray-50 rounded p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {concept.name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {concept.sessionTopic}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {getTimeAgo(concept.completedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                Complete concepts in your learning sessions to see them here!
              </div>
            )}
          </div>

          {/* Stats Overview */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Quick Stats
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Total Concepts:</span>
                <span className="ml-1 font-medium text-gray-900">{stats?.totalConcepts || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>
                <span className="ml-1 font-medium text-green-600">{stats?.completedConcepts || 0}</span>
              </div>
            </div>
            
            {stats && stats.recentAchievements > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-gray-600">New Badges:</span>
                <span className="ml-1 font-medium text-yellow-600">
                  🏆 {stats.recentAchievements}
                </span>
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-600 mb-2">
              💡 Complete concepts in this session to add them to your library!
            </div>
            <Link
              href="/library"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Explore Full Library →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 