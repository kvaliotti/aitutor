'use client';

import { useState } from 'react';

interface TherapySession {
  id: string;
  threadId: string;
  primaryConcern: string;
  therapyGoal?: string;
  therapyStyle: string;
  sessionType: string;
  status: string;
  progressLevel: number;
  createdAt: string;
  updatedAt: string;
}

interface TherapySessionManagerProps {
  sessions: TherapySession[];
  currentSession: TherapySession | null;
  onSessionChange: (session: TherapySession) => void;
  onCreateSession: () => void;
  isLoading: boolean;
}

export function TherapySessionManager({
  sessions,
  currentSession,
  onSessionChange,
  onCreateSession,
  isLoading
}: TherapySessionManagerProps) {
  const [showSessionsList, setShowSessionsList] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSessionTypeIcon = (sessionType: string) => {
    return sessionType === 'assessment' ? '📋' : '💭';
  };

  return (
    <div className="flex items-center space-x-3 relative">
      {/* Current Session Display */}
      {currentSession ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSessionsList(!showSessionsList)}
            className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
          >
            <span className="text-xs">{getSessionTypeIcon(currentSession.sessionType)}</span>
            <span className="text-xs font-medium truncate max-w-32">
              {currentSession.primaryConcern}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className="text-xs text-gray-700">
            {Math.round(currentSession.progressLevel)}%
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-700">No active session</div>
      )}

      {/* New Session Button */}
      <button
        onClick={onCreateSession}
        disabled={isLoading}
        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
      >
        <span>+</span>
        <span>New Session</span>
      </button>

      {/* Sessions Dropdown */}
      {showSessionsList && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Therapy Sessions</h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-700">
                <div className="text-lg mb-1">🧠</div>
                <p className="text-xs">No therapy sessions yet.</p>
                <p className="text-xs text-gray-600">Create your first session to get started!</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSessionChange(session);
                    setShowSessionsList(false);
                  }}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    currentSession?.id === session.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-sm">{getSessionTypeIcon(session.sessionType)}</span>
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {session.primaryConcern}
                        </h4>
                      </div>
                      {session.therapyGoal && (
                        <p className="text-xs text-gray-600 mb-1">
                          Goal: {session.therapyGoal}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 capitalize">
                        {session.therapyStyle} • {session.sessionType} • {formatDate(session.updatedAt)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-600 font-medium ml-2">
                      {Math.round(session.progressLevel)}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${session.progressLevel}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showSessionsList && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSessionsList(false)}
        />
      )}
    </div>
  );
} 