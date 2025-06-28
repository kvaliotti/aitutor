'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from './ChatInterface';
import { ConceptMapSidebar } from './ConceptMapSidebar';
import { TaskTracker } from './TaskTracker';
import { SessionManager } from './SessionManager';
import { TeachingSettings } from './TeachingSettings';

interface Session {
  id: string;
  threadId: string;
  topic: string;
  teachingStyle: string;
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
  const [progressUpdateTimeout, setProgressUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  
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

  const loadSessionData = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      // Load concepts, tasks, and messages in parallel
      const [conceptsRes, tasksRes, messagesRes] = await Promise.all([
        fetch(`/api/tutor/concepts?sessionId=${sessionId}`),
        fetch(`/api/tutor/tasks?sessionId=${sessionId}`),
        fetch(`/api/tutor/chat?sessionId=${sessionId}`)
      ]);

      if (conceptsRes.ok) {
        const conceptsData = await conceptsRes.json();
        setConcepts(conceptsData.concepts);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks);
      }

      if (messagesRes.ok) {
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

  const createNewSession = async (topic: string, teachingStyle: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Creating new session:', { topic, teachingStyle });

      const response = await fetch('/api/tutor/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, teachingStyle })
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
            await sendMessageToSession(newSession, `Hello! I'm ready to start learning about ${topic}. Please create a learning path for me and give me my first practice task!`);
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
        return null;
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please check your connection and try again.');
      return null;
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

    console.log('Sending message to session:', session.id, 'Message:', message);

    // Create user message object outside try block so it's accessible in catch
    const userMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique temp ID
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };

    try {
      setIsLoading(true);
      setError(null);
      
      // Check if this might trigger a learning plan creation
      const isNewTopicRequest = messages.length === 0 || 
        message.toLowerCase().includes('learn') || 
        message.toLowerCase().includes('teach me') ||
        message.toLowerCase().includes('new topic') ||
        message.toLowerCase().includes('start');
      
      if (isNewTopicRequest) {
        setIsCreatingPlan(true);
      }
      
      // Add user message to UI immediately
      setMessages(prev => [...prev, userMessage]);

      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id, 
          message 
        })
      });

      console.log('Chat response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Chat response data:', data);
        
        // Handle response (now always combined)
        const aiMessage: Message = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString()
        };
        
        // Replace temporary user message with real one and add AI response
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== userMessage.id);
          const realUserMessage = {
            ...userMessage,
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          return [...withoutTemp, realUserMessage, aiMessage];
        });
        
        // Update concepts and tasks if they were modified
        if (data.concepts) {
          console.log('Updating concepts:', data.concepts);
          setConcepts(data.concepts);
        }
        if (data.tasks) {
          console.log('Updating tasks:', data.tasks);
          setTasks(data.tasks);
        }
        
        // Update session completion rate
        if (data.completionRate !== undefined) {
          setCurrentSession(prev => prev ? { ...prev, completionRate: data.completionRate } : null);
        }
        
      } else {
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        setError(errorData.error || 'Failed to send message');
        // Remove the temporary user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please check your connection and try again.');
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      setIsCreatingPlan(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSession) {
      console.error('No current session when trying to send message');
      setError('No active session. Please create a new learning session first.');
      return;
    }

    await sendMessageToSession(currentSession, message);
  };

  // Debounced function to send progress updates to the agent
  const scheduleProgressUpdate = () => {
    console.log('scheduleProgressUpdate called', { 
      currentSession: currentSession?.id, 
      conceptsCount: concepts.length, 
      tasksCount: tasks.length 
    });
    
    if (!currentSession) {
      console.log('No current session, skipping progress update');
      return;
    }

    // Clear existing timeout
    if (progressUpdateTimeout) {
      console.log('Clearing existing progress update timeout');
      clearTimeout(progressUpdateTimeout);
    }

    // Set new timeout for 1.5 seconds
    const newTimeout = setTimeout(async () => {
      console.log('Progress update timeout triggered, fetching fresh data...');
      
      try {
        // Fetch fresh data to avoid stale closure issues
        const [conceptsRes, tasksRes] = await Promise.all([
          fetch(`/api/tutor/concepts?sessionId=${currentSession.id}`),
          fetch(`/api/tutor/tasks?sessionId=${currentSession.id}`)
        ]);

        const freshConcepts = conceptsRes.ok ? (await conceptsRes.json()).concepts : [];
        const freshTasks = tasksRes.ok ? (await tasksRes.json()).tasks : [];
        
        const completedConceptNames = freshConcepts
          .filter((c: any) => c.isCompleted)
          .map((c: any) => c.name);
        
        const completedTaskTitles = freshTasks
          .filter((t: any) => t.isCompleted)
          .map((t: any) => t.title);

        console.log('Fresh progress update data:', { 
          totalConcepts: freshConcepts.length,
          totalTasks: freshTasks.length,
          completedConceptNames, 
          completedTaskTitles 
        });

        if (completedConceptNames.length > 0 || completedTaskTitles.length > 0) {
          let progressMessage = "🎉 Progress Update: I just completed some learning milestones!\n\n";
          
          if (completedConceptNames.length > 0) {
            progressMessage += `✅ Completed Concepts:\n${completedConceptNames.map((name: string) => `• ${name}`).join('\n')}\n\n`;
          }
          
          if (completedTaskTitles.length > 0) {
            progressMessage += `✅ Completed Tasks:\n${completedTaskTitles.map((title: string) => `• ${title}`).join('\n')}\n\n`;
          }
          
          progressMessage += "What should I focus on next in my learning journey?";

          console.log('Sending progress update message:', progressMessage);
          
          // Send the progress update to the agent
          await sendMessageToSession(currentSession, progressMessage);
        } else {
          console.log('No completed concepts or tasks, skipping progress message');
        }
      } catch (error) {
        console.error('Error fetching fresh progress data:', error);
      }

      // Clear the timeout reference
      setProgressUpdateTimeout(null);
    }, 1500); // 1.5 second delay

    console.log('Set new progress update timeout');
    setProgressUpdateTimeout(newTimeout);
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
        
        // Reload session to get updated completion rate
        loadSessionData(currentSession.id);
        
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

  const handleCreateSession = async (topic: string, teachingStyle: string) => {
    try {
      const session = await createNewSession(topic, teachingStyle);
      if (session) {
        setCurrentSession(session);
        loadSessionData(session.id);
        setShowSessionSelector(false);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please check your connection and try again.');
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
      {/* Top Header - Fixed Height with Session Management */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Tutor</h1>
            {currentSession && (
              <p className="text-xs text-gray-600">Learning: {currentSession.topic}</p>
            )}
          </div>
          
          {/* Session Management in Header */}
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
        
        {/* User Profile Section */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{userEmail}</p>
            <p className="text-xs text-gray-500">Signed in</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
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