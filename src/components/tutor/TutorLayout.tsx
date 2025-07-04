'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from './ChatInterface';
import { ConceptMapSidebar } from './ConceptMapSidebar';
import { TaskTracker } from './TaskTracker';
import { SessionManager } from './SessionManager';
import { TeachingSettings } from './TeachingSettings';
import { Navigation } from '@/components/Navigation';
import { LibraryPreview } from './LibraryPreview';

interface Session {
  id: string;
  threadId: string;
  topic: string;
  teachingStyle: string;
  responseStyle: string;
  status: string;
  completionRate: number;
  createdAt: string;
  updatedAt: string;
}

interface Concept {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  orderIndex: number;
  subConcepts?: Concept[];
}

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function TutorLayout() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [user, setUser] = useState<{ id: string; email: string; createdAt: string } | null>(null);
  const [progressUpdateTimeout, setProgressUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  
  // Debounced progress update system
  const [pendingProgressUpdates, setPendingProgressUpdates] = useState<{
    completedConcepts: string[];
    completedTasks: string[];
  }>({ completedConcepts: [], completedTasks: [] });

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateTimeout) {
        clearTimeout(progressUpdateTimeout);
      }
      // Reset request state on unmount
      setIsRequestInProgress(false);
    };
  }, [progressUpdateTimeout]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/tutor/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        
        // If no current session and there are sessions, select the most recent one
        if (!currentSession && data.sessions.length > 0) {
          setCurrentSession(data.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Failed to load sessions');
    }
  };

  const getUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.user.email);
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie server-side
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Also clear client-side cookie as backup
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if API fails, still clear cookie and redirect
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      window.location.href = '/login';
    }
  };

  const loadSessionData = async (sessionId: string, reloadMessages: boolean = true) => {
    try {
      setIsLoading(true);
      
      // Load concepts, tasks, and messages in parallel
      const requests = [
        fetch(`/api/tutor/concepts?sessionId=${sessionId}`),
        fetch(`/api/tutor/tasks?sessionId=${sessionId}`)
      ];
      
      // Only reload messages if explicitly requested (avoid overwriting recent UI updates)
      if (reloadMessages) {
        requests.push(fetch(`/api/tutor/chat?sessionId=${sessionId}`));
      }
      
      const responses = await Promise.all(requests);
      const [conceptsRes, tasksRes, messagesRes] = responses;

      if (conceptsRes.ok) {
        const conceptsData = await conceptsRes.json();
        setConcepts(conceptsData.concepts);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks);
      }

      // Only update messages if we actually fetched them
      if (reloadMessages && messagesRes && messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages);
      }

    } catch (error) {
      console.error('Error loading session data:', error);
      setError('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async (topic: string, goal: string, teachingStyle: string, responseStyle: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Creating new session:', { topic, goal, teachingStyle, responseStyle });

      const response = await fetch('/api/tutor/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), goal: goal.trim(), teachingStyle, responseStyle })
      });

      console.log('Session creation response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        
        console.log('New session created:', newSession);
        
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        
        // Clear previous session data
        setConcepts([]);
        setTasks([]);
        setMessages([]);
        
        // Send initial welcome message after a short delay to ensure session is set
        setTimeout(async () => {
          console.log('Sending initial welcome message for session:', newSession.id);
          try {
            // Send enhanced message with both what and why
            await sendMessageToSession(newSession, `I want to learn ${topic}, so that I ${goal}. Please create a learning path for me and give me my first practice task!`);
          } catch (msgError) {
            console.error('Error sending initial message:', msgError);
            setError('Session created but failed to start conversation. Please try sending a message manually.');
          }
        }, 1000); // Increased delay to 1 second
        
        return newSession;
      } else {
        const errorData = await response.json();
        console.error('Session creation failed:', errorData);
        setError(errorData.error || 'Failed to create session');
        throw new Error(errorData.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please check your connection and try again.');
      throw error; // Re-throw the error instead of returning null
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeachingStyle = async (style: string) => {
    if (!currentSession) return;

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: currentSession.id, 
          teachingStyle: style 
        })
      });

      if (response.ok) {
        setCurrentSession(prev => prev ? { ...prev, teachingStyle: style } : null);
        setSessions(prev => prev.map(s => 
          s.id === currentSession.id ? { ...s, teachingStyle: style } : s
        ));
      }
    } catch (error) {
      console.error('Error updating teaching style:', error);
      setError('Failed to update teaching style');
    }
  };

  const sendMessageToSession = async (session: Session, message: string) => {
    if (!session) {
      console.error('No session provided when trying to send message');
      setError('No active session. Please create a new learning session first.');
      return;
    }

    // Prevent multiple concurrent requests to avoid race conditions
    if (isRequestInProgress) {
      console.warn('Request already in progress, skipping duplicate request');
      setError('Please wait for the current message to complete before sending another.');
      return;
    }

    console.log('Sending message to session:', session.id, 'Message:', message);

    // Create user message object outside try block so it's accessible in catch
    const userMessage: Message = {
      id: `temp-${Date.now()}-${Math.random()}`,
      content: message,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    try {
      setIsRequestInProgress(true);
      setError(null);

      // Add user message immediately for better UX
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000); // 60 second timeout

      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          message: message,
          threadId: session.threadId,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Create assistant message
        const assistantMessage: Message = {
          id: `ai-${Date.now()}-${Math.random()}`,
          content: data.response,
          role: 'assistant',
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Reload concepts and tasks only (preserve messages to avoid overwriting UI)
        try {
          await loadSessionData(session.id, false);
        } catch (loadError) {
          console.warn('Failed to reload session data:', loadError);
          // Don't fail the entire request if session reload fails
        }
      } else {
        throw new Error(data.error || 'Failed to get response from AI');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      
      // Set appropriate error message with proper type checking
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again with a shorter message.');
        } else if (error.message.includes('Failed to fetch')) {
          setError('Connection error. Please check your internet connection and try again.');
        } else {
          setError(error.message || 'Failed to send message. Please try again.');
        }
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRequestInProgress(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSession) {
      console.error('No current session when trying to send message');
      setError('No active session. Please create a new learning session first.');
      return;
    }

    if (isRequestInProgress) {
      console.warn('Message request already in progress');
      setError('Please wait for the current message to complete before sending another.');
      return;
    }

    await sendMessageToSession(currentSession, message);
  };

  // Debounced function to send progress updates to the agent
  const scheduleProgressUpdate = () => {
    console.log('scheduleProgressUpdate called - DISABLED to prevent fetch collisions');
    // DISABLED: This automated system was causing "Failed to fetch" errors
    // by creating race conditions with user-initiated messages and hitting rate limits
    
    // Original problematic code that caused fetch collisions:
    // - Multiple automated sendMessageToSession calls
    // - Race conditions with user messages  
    // - Rate limiting (60 requests/minute)
    // - Background requests interfering with user requests
    
    return; // Early return to disable this feature
    
    // TODO: Replace with a better approach:
    // - Show progress updates in UI only (no automated API calls)
    // - Let users manually ask for progress reviews
    // - Use a queue system to prevent race conditions
  };

  const toggleConceptCompletion = async (conceptId: string, isCompleted: boolean) => {
    if (!currentSession) return;

    try {
      const response = await fetch('/api/tutor/concepts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conceptId, 
          isCompleted,
          sessionId: currentSession.id
        })
      });

      if (response.ok) {
        setConcepts(prev => prev.map(concept => 
          concept.id === conceptId ? { ...concept, isCompleted } : concept
        ));
        
        // Reload session to get updated completion rate (but don't reload messages)
        loadSessionData(currentSession.id, false);
        
        // Schedule progress update to agent if completing (not uncompleting)
        if (isCompleted) {
          scheduleProgressUpdate();
        }
      }
    } catch (error) {
      console.error('Error updating concept:', error);
      setError('Failed to update concept');
    }
  };

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    try {
      const response = await fetch('/api/tutor/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, isCompleted })
      });

      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, isCompleted } : task
        ));
        
        // Schedule progress update to agent if completing (not uncompleting)
        if (isCompleted) {
          scheduleProgressUpdate();
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
    }
  };

  const handleCreateSession = async (topic: string, goal: string, teachingStyle: string, responseStyle: string) => {
    try {
      const session = await createNewSession(topic, goal, teachingStyle, responseStyle);
      setCurrentSession(session);
      loadSessionData(session.id);
      setShowSessionSelector(false);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please check your connection and try again.');
      // Re-throw the error so the form can handle it
      throw error;
    }
  };

  const handleSelectSession = async (session: Session) => {
    try {
      setCurrentSession(session);
      loadSessionData(session.id);
      setShowSessionSelector(false);
    } catch (error) {
      console.error('Error selecting session:', error);
      setError('Failed to select session. Please try again later.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Navigation Header */}
      <Navigation user={user || undefined} variant="minimal" />
      
      {/* Session Management Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          {currentSession && (
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Current Session</p>
                <p className="text-xs text-gray-600">Learning: {currentSession.topic}</p>
              </div>
              
              {/* Quick Library Access */}
              <div className="hidden sm:flex items-center space-x-2 border-l border-gray-200 pl-4">
                <a
                  href="/library"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  📚 View Library
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href="/dashboard"
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  🏠 Dashboard
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* Session Management */}
        <div className="flex items-center space-x-3">
          <SessionManager
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

      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 flex min-h-0">
        {/* Main Chat Area - 2/3 width */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatInterface
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
          {/* Teaching Settings - Fixed at top */}
          {currentSession && (
            <div className="border-b border-gray-200 p-3 flex-shrink-0">
              <TeachingSettings
                currentStyle={currentSession.teachingStyle}
                onStyleChange={updateTeachingStyle}
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
                    style={{ width: `${currentSession.completionRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round(currentSession.completionRate)}% complete
                </p>
              </div>

              {/* Library Preview - Scrollable */}
              <LibraryPreview />
              
              {/* Concept Map - Scrollable */}
              <div className="border-b border-gray-200">
                <ConceptMapSidebar
                  concepts={concepts}
                  onToggleCompletion={toggleConceptCompletion}
                />
              </div>
              
              {/* Task Tracker - Scrollable */}
              <div>
                <TaskTracker
                  tasks={tasks}
                  onToggleCompletion={toggleTaskCompletion}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 