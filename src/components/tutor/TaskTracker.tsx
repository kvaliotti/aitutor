'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
  concept?: {
    id: string;
    name: string;
  };
}

interface TaskTrackerProps {
  tasks: Task[];
  onToggleCompletion: (taskId: string, isCompleted: boolean) => void;
}

export function TaskTracker({ tasks, onToggleCompletion }: TaskTrackerProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
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

  const pendingTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Practice Tasks</h3>
        <div className="text-xs text-gray-600">
          {completedTasks.length}/{tasks.length}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <div className="text-xl mb-1">📝</div>
          <p className="text-xs">No practice tasks yet.</p>
          <p className="text-xs text-gray-400">Your AI tutor will create tasks as you learn!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">
                To Do ({pendingTasks.length})
              </div>
              <div className="space-y-1.5">
                {pendingTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpanded={() => toggleExpanded(task.id)}
                    onToggleCompletion={onToggleCompletion}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Completed ({completedTasks.length})
              </div>
              <div className="space-y-1.5">
                {completedTasks.slice(0, 3).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpanded={() => toggleExpanded(task.id)}
                    onToggleCompletion={onToggleCompletion}
                    formatDate={formatDate}
                  />
                ))}
                {completedTasks.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-2">
                    ... and {completedTasks.length - 3} more completed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-center">
          <div className="text-xs text-yellow-700">
            🎯 {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} to complete
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleCompletion: (taskId: string, isCompleted: boolean) => void;
  formatDate: (dateString: string) => string;
}

function TaskItem({ 
  task, 
  isExpanded, 
  onToggleExpanded, 
  onToggleCompletion, 
  formatDate 
}: TaskItemProps) {
  return (
    <div 
      className={`border rounded p-2 transition-colors ${
        task.isCompleted 
          ? 'border-green-200 bg-green-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={(e) => onToggleCompletion(task.id, e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 
              className={`font-medium text-sm ${
                task.isCompleted 
                  ? 'text-green-800 line-through' 
                  : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>
            <button
              onClick={onToggleExpanded}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
          
          {task.concept && (
            <div className="text-xs text-gray-600 mt-0.5">
              📚 {task.concept.name}
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-0.5">
            {formatDate(task.createdAt)}
          </div>
          
          {isExpanded && (
            <div className="mt-1.5 text-xs text-gray-700 leading-relaxed">
              {task.description}
            </div>
          )}
        </div>
        
        {task.isCompleted && (
          <div className="text-green-600 text-lg mt-1">✓</div>
        )}
      </div>
    </div>
  );
} 