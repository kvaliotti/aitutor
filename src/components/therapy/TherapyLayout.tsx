'use client';

import { useState, useEffect } from 'react';
import { CBTChatInterface } from './CBTChatInterface';
import { Navigation } from '@/components/Navigation';
import { TherapyGoalsSidebar } from './TherapyGoalsSidebar';
import { TherapyExerciseTracker } from './TherapyExerciseTracker';
import { TherapySettings } from './TherapySettings';
import { TherapySessionManager } from './TherapySessionManager';
import { ABCDETracker } from './ABCDETracker';

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

interface TherapyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: string;
  createdAt: string;
}

interface TherapyGoal {
  id: string;
  title: string;
  description: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
}

interface TherapyExercise {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
}

export function TherapyLayout() {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [currentSession, setCurrentSession] = useState<TherapySession | null>(null);
  const [messages, setMessages] = useState<TherapyMessage[]>([]);
  const [goals, setGoals] = useState<TherapyGoal[]>([]);
  const [exercises, setExercises] = useState<TherapyExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; createdAt: string } | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(false);

  // Load user sessions on component mount
  useEffect(() => {
    loadSessions();
    getUserInfo();
  }, []);

  // Show session selector if no current session and no sessions exist, or if explicitly requested
  useEffect(() => {
    if (!currentSession && sessions.length === 0) {
      setShowSessionSelector(true);
    } else if (!currentSession && sessions.length > 0) {
      // User has sessions but no current one - show selector to choose
      setShowSessionSelector(true);
    }
  }, [currentSession, sessions]);

  // Load session data when currentSession changes
  useEffect(() => {
    if (currentSession) {
      loadSessionData(currentSession.id);
    }
  }, [currentSession]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/therapy/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        
        // If no current session and there are sessions, select the most recent one
        if (!currentSession && data.sessions && data.sessions.length > 0) {
          setCurrentSession(data.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading therapy sessions:', error);
      setError('Failed to load therapy sessions');
    }
  };

  const getUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      // Load goals, exercises, and messages in parallel
      const [goalsRes, exercisesRes, messagesRes] = await Promise.all([
        fetch(`/api/therapy/goals?sessionId=${sessionId}`),
        fetch(`/api/therapy/exercises?sessionId=${sessionId}`),
        fetch(`/api/therapy/chat?sessionId=${sessionId}`)
      ]);

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals || []);
      }

      if (exercisesRes.ok) {
        const exercisesData = await exercisesRes.json();
        setExercises(exercisesData.exercises || []);
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

    } catch (error) {
      console.error('Error loading therapy session data:', error);
      setError('Failed to load therapy session data');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async (primaryConcern: string, therapyGoal: string, therapyStyle: string, sessionType: string) => {
    try {
      setIsLoading(true);
      setIsCreatingPlan(true);
      setError(null);
      
      console.log('Creating new therapy session:', { primaryConcern, therapyGoal, therapyStyle, sessionType });

      const response = await fetch('/api/therapy/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          primaryConcern: primaryConcern.trim(), 
          therapyGoal: therapyGoal.trim(), 
          therapyStyle, 
          sessionType 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        
        console.log('New therapy session created:', newSession);
        
        // Update sessions list
        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        
        // Set as current session and load its data
        setCurrentSession(newSession);
        setShowSessionSelector(false);
        
        // Send initial message to start the CBT assessment
        await sendMessageToSession(newSession, 'Hello, I would like to start my CBT therapy session.');
        
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create therapy session');
      }
    } catch (error) {
      console.error('Error creating therapy session:', error);
      setError('Failed to create therapy session');
    } finally {
      setIsLoading(false);
      setIsCreatingPlan(false);
    }
  };

  const sendMessageToSession = async (session: TherapySession, message: string) => {
    try {
      setIsLoading(true);
      
      // Add user message to local state immediately
      const userMessage: TherapyMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      const response = await fetch('/api/therapy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id, 
          message,
          threadId: session.threadId 
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Replace temp user message and add assistant response
        setMessages(prev => [
          ...prev.filter(m => m.id !== userMessage.id),
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            createdAt: new Date().toISOString()
          },
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            createdAt: new Date().toISOString()
          }
        ]);

        // Refresh session data to get updated goals/exercises
        await loadSessionData(session.id);
        
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send message');
        // Remove the temporary user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSession) {
      setError('No active therapy session');
      return;
    }
    
    await sendMessageToSession(currentSession, message);
  };

  const handleCreateSession = async (primaryConcern: string, therapyGoal: string, therapyStyle: string, sessionType: string) => {
    await createNewSession(primaryConcern, therapyGoal, therapyStyle, sessionType);
  };

  const handleSelectSession = async (session: TherapySession) => {
    setCurrentSession(session);
    setShowSessionSelector(false);
    await loadSessionData(session.id);
  };

  const updateTherapyStyle = async (style: string) => {
    if (!currentSession) return;
    
    try {
      const response = await fetch('/api/therapy/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: currentSession.id, 
          therapyStyle: style 
        })
      });

      if (response.ok) {
        setCurrentSession(prev => prev ? { ...prev, therapyStyle: style } : null);
        // Update sessions list
        setSessions(prev => prev.map(session => 
          session.id === currentSession.id ? { ...session, therapyStyle: style } : session
        ));
      }
    } catch (error) {
      console.error('Error updating therapy style:', error);
      setError('Failed to update therapy style');
    }
  };

  const toggleGoalCompletion = async (goalId: string, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/therapy/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goalId, 
          completed: isCompleted,
          sessionId: currentSession?.id
        })
      });

      if (response.ok) {
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, completed: isCompleted } : goal
        ));
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      setError('Failed to update goal');
    }
  };

  const toggleExerciseCompletion = async (exerciseId: string, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/therapy/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exerciseId, 
          completed: isCompleted 
        })
      });

      if (response.ok) {
        setExercises(prev => prev.map(exercise => 
          exercise.id === exerciseId ? { ...exercise, completed: isCompleted } : exercise
        ));
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      setError('Failed to update exercise');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Navigation Header */}
      <Navigation user={user || undefined} variant="minimal" />
      
      {/* Header with Disclaimer */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            🧠 CBT Psychotherapist
          </h1>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-4 w-4 text-amber-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-amber-700">
                <strong>Educational CBT Tool</strong> - Not a replacement for professional therapy. 
                Crisis support: <span className="font-medium">988 (Suicide Prevention)</span> | 
                <span className="font-medium">741741 (Crisis Text)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Session Management Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          {currentSession && (
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Current Session</p>
                <p className="text-xs text-gray-600">Concern: {currentSession.primaryConcern}</p>
              </div>
              
              {/* Quick Navigation */}
              <div className="hidden sm:flex items-center space-x-2 border-l border-gray-200 pl-4">
                <a
                  href="/dashboard"
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  🏠 Dashboard
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href="/tutor"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  📚 AI Tutor
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href="/therapy/abcde"
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  🧠 ABCDE Exercises
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* Session Management */}
        <div className="flex items-center space-x-3">
          <TherapySessionManager
            sessions={sessions}
            currentSession={currentSession}
            onSessionChange={(session) => {
              setCurrentSession(session);
              loadSessionData(session.id);
              setShowSessionSelector(false);
            }}
            onCreateSession={() => setShowSessionSelector(true)}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 mx-6 my-2 rounded p-2 flex-shrink-0">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 flex min-h-0">
        {/* Main Chat Area - 2/3 width */}
        <div className="flex-1 flex flex-col min-h-0">
          <CBTChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isCreatingPlan={isCreatingPlan}
            showSessionSelector={showSessionSelector}
            onCreateSession={handleCreateSession}
            sessions={sessions}
            onSelectSession={handleSelectSession}
          />
        </div>
        
        {/* Sidebar - 1/3 width */}
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col min-h-0">
          {/* Therapy Settings - Fixed at top */}
          {currentSession && (
            <div className="border-b border-gray-200 p-3 flex-shrink-0">
              <TherapySettings
                currentStyle={currentSession.therapyStyle}
                onStyleChange={updateTherapyStyle}
              />
            </div>
          )}
          
          {/* Scrollable Core Content Area - Takes remaining space */}
          {currentSession && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Progress Bar - Scrollable */}
              <div className="border-b border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900">Progress</h3>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentSession.progressLevel}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round(currentSession.progressLevel)}% complete
                </p>
              </div>
              
              {/* Therapy Goals - Scrollable */}
              <div className="border-b border-gray-200">
                <TherapyGoalsSidebar
                  goals={goals}
                  onToggleCompletion={toggleGoalCompletion}
                />
              </div>
              
              {/* CBT Exercises - Scrollable */}
              <div className="border-b border-gray-200">
                <TherapyExerciseTracker
                  exercises={exercises}
                  onToggleCompletion={toggleExerciseCompletion}
                />
              </div>
              
              {/* ABCDE Cognitive Restructuring - Scrollable */}
              <div>
                <ABCDETracker
                  sessionId={currentSession.id}
                  onExerciseClick={(exerciseId) => {
                    // Open ABCDE exercise detail in new tab
                    window.open(`/therapy/abcde/${exerciseId}`, '_blank');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 