'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ABCDEExercise {
  id: string;
  title: string;
  completionStatus: 'completed' | 'in_progress' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  activatingEvent: string;
  beliefs: string;
  consequences: string;
  disputation?: string;
  effectiveBeliefs?: string;
  session: {
    id: string;
    primaryConcern: string;
    therapyStyle: string;
    createdAt: string;
  };
}

interface Statistics {
  total: number;
  completed: number;
  inProgress: number;
  abandoned: number;
  completionRate: number;
}

interface User {
  id: string;
  email: string;
}

export default function ABCDEExercisesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [exercises, setExercises] = useState<ABCDEExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<ABCDEExercise[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    completed: 0,
    inProgress: 0,
    abandoned: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'status'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Expanded exercise IDs
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserInfo();
    loadABCDEExercises();
  }, []);

  useEffect(() => {
    filterAndSortExercises();
  }, [exercises, searchTerm, statusFilter, sortBy]);

  const loadUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadABCDEExercises = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/therapy/abcde?limit=100', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('ABCDE API: Unauthorized - redirecting to login');
          window.location.href = '/login';
          return;
        } else if (response.status === 404) {
          console.log('ABCDE API: No exercises found - this is normal for new users');
          setExercises([]);
          setStats({
            total: 0,
            completed: 0,
            inProgress: 0,
            completionRate: 0
          });
          return;
        } else {
          throw new Error(`Failed to load ABCDE exercises (${response.status})`);
        }
      }
      
      const data = await response.json();
      setExercises(data.exercises || []);
      setStatistics(data.statistics || {
        total: 0,
        completed: 0,
        inProgress: 0,
        abandoned: 0,
        completionRate: 0
      });
    } catch (error) {
      console.error('Error loading ABCDE exercises:', error);
      setError('Failed to load ABCDE exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortExercises = () => {
    let filtered = [...exercises];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exercise => 
        exercise.title.toLowerCase().includes(term) ||
        exercise.activatingEvent.toLowerCase().includes(term) ||
        exercise.beliefs.toLowerCase().includes(term) ||
        exercise.consequences.toLowerCase().includes(term) ||
        (exercise.disputation && exercise.disputation.toLowerCase().includes(term)) ||
        (exercise.effectiveBeliefs && exercise.effectiveBeliefs.toLowerCase().includes(term)) ||
        exercise.session.primaryConcern.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exercise => exercise.completionStatus === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.completionStatus.localeCompare(b.completionStatus);
        default:
          return 0;
      }
    });

    setFilteredExercises(filtered);
  };

  const toggleExerciseExpansion = (exerciseId: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId);
    } else {
      newExpanded.add(exerciseId);
    }
    setExpandedExercises(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: '✅', color: 'text-green-600 bg-green-50' };
      case 'in_progress':
        return { icon: '🔄', color: 'text-blue-600 bg-blue-50' };
      case 'abandoned':
        return { icon: '⏸️', color: 'text-gray-600 bg-gray-50' };
      default:
        return { icon: '❓', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 mb-2">Loading ABCDE Exercises...</div>
            <div className="text-sm text-gray-600">Please wait while we fetch your cognitive restructuring work.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm mb-6">
          <a href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-1">
            <span>🏠</span>
            <span>Dashboard</span>
          </a>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <a href="/therapy" className="text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-1">
            <span>🧠</span>
            <span>CBT Therapy</span>
          </a>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium flex items-center space-x-1">
            <span>🧩</span>
            <span>ABCDE Exercises</span>
          </span>
        </nav>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <span className="text-4xl">🧩</span>
                <span>ABCDE Cognitive Restructuring</span>
              </h1>
              <p className="text-gray-600 mt-2 max-w-3xl">
                Review your cognitive restructuring exercises using the evidence-based ABCDE framework. 
                Track your progress in challenging unhelpful thoughts and developing more balanced perspectives.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/therapy"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Therapy</span>
              </a>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exercises</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.inProgress}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{Math.round(statistics.completionRate)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search exercises by title, content, or concern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </button>
              
              {(searchTerm || statusFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">By Title</option>
                  <option value="status">By Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Exercises List */}
        {error ? (
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadABCDEExercises}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {exercises.length === 0 ? 'No ABCDE Exercises Yet' : 'No Matching Exercises'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {exercises.length === 0 
                ? 'Start a therapy session and ask for help with challenging thoughts or cognitive restructuring to create your first ABCDE exercise.'
                : 'Try adjusting your search terms or filters to find the exercises you\'re looking for.'
              }
            </p>
            <a
              href="/therapy"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Therapy Session
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {filteredExercises.length} Exercise{filteredExercises.length !== 1 ? 's' : ''} Found
              </h2>
            </div>
            
            {filteredExercises.map((exercise) => {
              const statusInfo = getStatusIcon(exercise.completionStatus);
              const isExpanded = expandedExercises.has(exercise.id);
              
              return (
                <div key={exercise.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Exercise Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">{statusInfo.icon}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{exercise.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {exercise.completionStatus.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div>Concern: <span className="font-medium">{exercise.session.primaryConcern}</span></div>
                          <div>•</div>
                          <div>Style: <span className="font-medium">{exercise.session.therapyStyle}</span></div>
                          <div>•</div>
                          <div>Created: {formatDate(exercise.createdAt)}</div>
                          {exercise.completedAt && (
                            <>
                              <div>•</div>
                              <div className="text-green-600">Completed: {formatDate(exercise.completedAt)}</div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleExerciseExpansion(exercise.id)}
                        className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* ABCDE Content */}
                  {isExpanded && (
                    <div className="p-6 space-y-6">
                      {/* A - Activating Event */}
                      <div className="border-l-4 border-red-400 pl-4">
                        <h4 className="text-sm font-semibold text-red-700 mb-2">
                          🔥 A - Activating Event
                        </h4>
                        <p className="text-gray-800 leading-relaxed">{exercise.activatingEvent}</p>
                      </div>
                      
                      {/* B - Beliefs */}
                      <div className="border-l-4 border-orange-400 pl-4">
                        <h4 className="text-sm font-semibold text-orange-700 mb-2">
                          💭 B - Beliefs (Thoughts)
                        </h4>
                        <p className="text-gray-800 leading-relaxed">{exercise.beliefs}</p>
                      </div>
                      
                      {/* C - Consequences */}
                      <div className="border-l-4 border-yellow-400 pl-4">
                        <h4 className="text-sm font-semibold text-yellow-700 mb-2">
                          😔 C - Consequences (Emotions & Behaviors)
                        </h4>
                        <p className="text-gray-800 leading-relaxed">{exercise.consequences}</p>
                      </div>
                      
                      {/* D - Disputation */}
                      {exercise.disputation && (
                        <div className="border-l-4 border-blue-400 pl-4">
                          <h4 className="text-sm font-semibold text-blue-700 mb-2">
                            🔍 D - Disputation (Challenge the Thoughts)
                          </h4>
                          <p className="text-gray-800 leading-relaxed">{exercise.disputation}</p>
                        </div>
                      )}
                      
                      {/* E - Effective New Beliefs */}
                      {exercise.effectiveBeliefs && (
                        <div className="border-l-4 border-green-400 pl-4">
                          <h4 className="text-sm font-semibold text-green-700 mb-2">
                            🌟 E - Effective New Beliefs
                          </h4>
                          <p className="text-gray-800 leading-relaxed">{exercise.effectiveBeliefs}</p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Progress: {exercise.disputation && exercise.effectiveBeliefs ? '100%' : exercise.disputation || exercise.effectiveBeliefs ? '75%' : '50%'} complete
                        </div>
                        <div className="flex items-center space-x-3">
                          <a
                            href={`/therapy?session=${exercise.session.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Return to Session →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Preview when collapsed */}
                  {!isExpanded && (
                    <div className="p-6">
                      <p className="text-gray-700 leading-relaxed">
                        <strong>Activating Event:</strong> {exercise.activatingEvent.substring(0, 150)}
                        {exercise.activatingEvent.length > 150 && '...'}
                      </p>
                      <button
                        onClick={() => toggleExerciseExpansion(exercise.id)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Full ABCDE Breakdown →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 