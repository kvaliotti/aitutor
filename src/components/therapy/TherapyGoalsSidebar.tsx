'use client';

import { useState } from 'react';

interface TherapyGoal {
  id: string;
  title: string;
  description: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
}

interface TherapyGoalsSidebarProps {
  goals: TherapyGoal[];
  onToggleCompletion: (goalId: string, isCompleted: boolean) => void;
}

export function TherapyGoalsSidebar({ goals, onToggleCompletion }: TherapyGoalsSidebarProps) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category?: string) => {
    if (!category) return '🎯';
    
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
    return iconMap[category.toLowerCase()] || '🎯';
  };

  const renderGoal = (goal: TherapyGoal) => {
    const isExpanded = expandedGoals.has(goal.id);

    return (
      <div key={goal.id} className="mb-1">
        <div className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpanded(goal.id)}
            className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-800"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={goal.completed}
            onChange={(e) => onToggleCompletion(goal.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          
          {/* Goal Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="text-sm">{getCategoryIcon(goal.category)}</span>
              <div 
                className={`text-sm font-medium ${
                  goal.completed 
                    ? 'text-gray-600 line-through' 
                    : 'text-gray-900'
                }`}
              >
                {goal.title}
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {goal.category ? goal.category.charAt(0).toUpperCase() + goal.category.slice(1) : 'General'} goal
            </div>
            
            {isExpanded && goal.description && (
              <div className="text-xs text-gray-700 mt-1 leading-relaxed">
                {goal.description}
              </div>
            )}
          </div>
          
          {/* Completion Badge */}
          {goal.completed && (
            <div className="text-green-600 text-sm">✓</div>
          )}
        </div>
      </div>
    );
  };

  if (goals.length === 0) {
    return (
      <div className="p-3 text-center text-gray-700">
        <div className="text-xl mb-1">🎯</div>
        <p className="text-xs">No therapy goals yet.</p>
        <p className="text-xs text-gray-600">Start your CBT session to set therapeutic goals!</p>
      </div>
    );
  }

  const completedCount = goals.filter(g => g.completed).length;
  const totalCount = goals.length;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Therapy Goals</h3>
        <div className="text-xs text-gray-600">
          {completedCount}/{totalCount}
        </div>
      </div>
      
      <div className="space-y-1">
        {goals.map(goal => renderGoal(goal))}
      </div>
      
      {totalCount > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-center">
          <div className="text-xs text-blue-700">
            {completedCount === totalCount 
              ? '🎉 All goals achieved!'
              : `${totalCount - completedCount} goal${totalCount - completedCount > 1 ? 's' : ''} in progress`
            }
          </div>
        </div>
      )}
    </div>
  );
} 