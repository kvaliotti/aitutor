'use client';

import { useState } from 'react';

interface TherapyExercise {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

interface TherapyExerciseTrackerProps {
  exercises: TherapyExercise[];
  onToggleCompletion: (exerciseId: string, isCompleted: boolean) => void;
}

export function TherapyExerciseTracker({ exercises, onToggleCompletion }: TherapyExerciseTrackerProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategoryIcon = (category?: string) => {
    if (!category) return '📋';
    
    const iconMap: { [key: string]: string } = {
      'anxiety': '😰',
      'depression': '😔',
      'stress': '😤',
      'cognitive': '🧠',
      'behavioral': '🎯',
      'emotional': '💭',
      'relational': '👥',
      'self-concept': '🌟'
    };
    return iconMap[category.toLowerCase()] || '📋';
  };

  const pendingExercises = exercises.filter(exercise => !exercise.completed);
  const completedExercises = exercises.filter(exercise => exercise.completed);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">CBT Exercises</h3>
        <div className="text-xs text-gray-600">
          {completedExercises.length}/{exercises.length}
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-4 text-gray-700">
          <div className="text-xl mb-1">📋</div>
          <p className="text-xs">No CBT exercises yet.</p>
          <p className="text-xs text-gray-600">Your CBT therapist will suggest exercises as you progress!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending Exercises */}
          {pendingExercises.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">
                To Practice ({pendingExercises.length})
              </div>
              <div className="space-y-1.5">
                {pendingExercises.map(exercise => (
                  <ExerciseItem
                    key={exercise.id}
                    exercise={exercise}
                    isExpanded={expandedExercises.has(exercise.id)}
                    onToggleExpanded={() => toggleExpanded(exercise.id)}
                    onToggleCompletion={onToggleCompletion}
                    formatDate={formatDate}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Exercises */}
          {completedExercises.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">
                Completed ({completedExercises.length})
              </div>
              <div className="space-y-1.5">
                {completedExercises.slice(0, 3).map(exercise => (
                  <ExerciseItem
                    key={exercise.id}
                    exercise={exercise}
                    isExpanded={expandedExercises.has(exercise.id)}
                    onToggleExpanded={() => toggleExpanded(exercise.id)}
                    onToggleCompletion={onToggleCompletion}
                    formatDate={formatDate}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))}
                {completedExercises.length > 3 && (
                  <div className="text-xs text-gray-600 text-center py-2">
                    ... and {completedExercises.length - 3} more completed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {pendingExercises.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-center">
          <div className="text-xs text-blue-700">
            🧘 {pendingExercises.length} exercise{pendingExercises.length > 1 ? 's' : ''} to practice
          </div>
        </div>
      )}
    </div>
  );
}

interface ExerciseItemProps {
  exercise: TherapyExercise;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleCompletion: (exerciseId: string, isCompleted: boolean) => void;
  formatDate: (dateString: string) => string;
  getCategoryIcon: (category?: string) => string;
}

function ExerciseItem({ 
  exercise, 
  isExpanded, 
  onToggleExpanded, 
  onToggleCompletion, 
  formatDate,
  getCategoryIcon
}: ExerciseItemProps) {
  return (
    <div 
      className={`border rounded p-2 transition-colors ${
        exercise.completed 
          ? 'border-green-200 bg-green-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          checked={exercise.completed}
          onChange={(e) => onToggleCompletion(exercise.id, e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-sm">{getCategoryIcon(exercise.category)}</span>
              <h4 
                className={`font-medium text-sm ${
                  exercise.completed 
                    ? 'text-green-800 line-through' 
                    : 'text-gray-900'
                }`}
              >
                {exercise.title}
              </h4>
            </div>
            <button
              onClick={onToggleExpanded}
              className="ml-2 text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
          
          <div className="text-xs text-gray-600 mt-0.5">
            {exercise.category ? exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1) : 'General'} • {formatDate(exercise.createdAt)}
          </div>
          
          {isExpanded && (
            <div className="mt-1.5 space-y-1">
              <div className="text-xs text-gray-700 leading-relaxed">
                <strong>Description:</strong> {exercise.description}
              </div>
              {exercise.instructions && (
                <div className="text-xs text-gray-700 leading-relaxed">
                  <strong>Instructions:</strong> {exercise.instructions}
                </div>
              )}
            </div>
          )}
        </div>
        
        {exercise.completed && (
          <div className="text-green-600 text-lg mt-1">✓</div>
        )}
      </div>
    </div>
  );
} 