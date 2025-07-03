'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

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
}

interface ABCDETrackerProps {
  sessionId?: string;
  onExerciseClick?: (exerciseId: string) => void;
}

export function ABCDETracker({ sessionId, onExerciseClick }: ABCDETrackerProps) {
  const [exercises, setExercises] = useState<ABCDEExercise[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    completionRate: 0
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadABCDEExercises();
    }
  }, [sessionId]);

  const loadABCDEExercises = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);
      params.append('limit', '10'); // Show recent 10 exercises
      
      const response = await fetch(`/api/therapy/abcde?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('ABCDE API: Unauthorized - user may need to log in again');
          setError('Please refresh the page and log in again');
          return;
        } else if (response.status === 404) {
          console.log('ABCDE API: No exercises found - this is normal for new users');
          setExercises([]);
          setStatistics({
            total: 0,
            completed: 0,
            inProgress: 0,
            completionRate: 0
          });
          return;
        } else {
          console.error('ABCDE API error:', response.status, response.statusText);
          setError(`Unable to load exercises (${response.status})`);
          return;
        }
      }
      
      const data = await response.json();
      setExercises(data.exercises || []);
      setStatistics(data.statistics || {
        total: 0,
        completed: 0,
        inProgress: 0,
        completionRate: 0
      });
    } catch (error) {
      console.error('Error loading ABCDE exercises:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Unable to connect to server. Please refresh the page.');
      } else {
        setError('Unable to load exercises. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'abandoned':
        return '⏸️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'abandoned':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExerciseClick = (exerciseId: string) => {
    if (onExerciseClick) {
      onExerciseClick(exerciseId);
    }
  };

  const navigateToABCDEPage = () => {
    window.open('/therapy/abcde', '_blank');
  };

  return (
    <div className="border-b border-gray-200">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🧠</span>
            <h3 className="text-sm font-semibold text-gray-900">
              Cognitive Restructuring
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{statistics.total}</div>
                  <div className="text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{statistics.completed}</div>
                  <div className="text-gray-600">Complete</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{statistics.inProgress}</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{Math.round(statistics.completionRate)}%</div>
                  <div className="text-gray-600">Success</div>
                </div>
              </div>
            </div>

            {/* Recent Exercises */}
            {isLoading ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600">Loading ABCDE exercises...</div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="text-sm text-red-600">{error}</div>
                <button
                  onClick={loadABCDEExercises}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Try Again
                </button>
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600 mb-2">No ABCDE exercises yet</div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Start a conversation about challenging thoughts or ask for cognitive restructuring help
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-700">Recent Exercises</h4>
                  <button
                    onClick={navigateToABCDEPage}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All →
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {exercises.slice(0, 5).map((exercise) => (
                    <div
                      key={exercise.id}
                      onClick={() => handleExerciseClick(exercise.id)}
                      className="group cursor-pointer p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="flex-shrink-0">
                              {getStatusIcon(exercise.completionStatus)}
                            </span>
                            <h5 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                              {exercise.title}
                            </h5>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {exercise.activatingEvent.substring(0, 80)}...
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exercise.completionStatus)}`}>
                            {exercise.completionStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(exercise.createdAt)}
                        </div>
                        {exercise.completedAt && (
                          <div className="text-xs text-green-600">
                            Completed: {formatDate(exercise.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={navigateToABCDEPage}
                className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                📝 View All ABCDE
              </button>
              <button
                onClick={loadABCDEExercises}
                className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 