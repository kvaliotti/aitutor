'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReactNode } from 'react';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ParsedMessagePart {
  agentName: string;
  agentIcon: string;
  agentColor: string;
  agentTextColor: string;
  content: string;
}

interface ParsedMessage extends Message {
  parsedParts?: ParsedMessagePart[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isCreatingPlan: boolean;
  showSessionSelector: boolean;
  onCreateSession: (topic: string, goal: string, teachingStyle: string, responseStyle: string) => Promise<void>;
  sessions: Session[];
  onSelectSession: (session: Session) => Promise<void>;
}

// Type definitions for ReactMarkdown components
interface MarkdownComponentProps {
  children?: ReactNode;
}

interface AnchorComponentProps extends MarkdownComponentProps {
  href?: string;
}

// Simple, isolated session creation form component
function SessionCreationForm({ 
  onCreateSession, 
  isCreating 
}: { 
  onCreateSession: (topic: string, goal: string, teachingStyle: string, responseStyle: string) => Promise<void>;
  isCreating: boolean;
}) {
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [teachingStyle, setTeachingStyle] = useState('step-by-step');
  const [responseStyle, setResponseStyle] = useState('detailed');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !goal.trim() || isCreating) return;
    
    try {
      setError(null);
      await onCreateSession(topic.trim(), goal.trim(), teachingStyle, responseStyle);
      
      // Only clear form fields if session creation succeeded
      setTopic('');
      setGoal('');
      setTeachingStyle('step-by-step');
      setResponseStyle('detailed');
    } catch (err) {
      // Handle errors and show feedback to user
      console.error('Session creation error:', err);
      setError('Failed to create session. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-gray-700">Tell us what you want to learn and why</p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-red-600 text-sm">⚠️</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              I want to learn...
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., React Hooks, Machine Learning, Python..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              So that I can...
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., build better web apps, advance my career, understand AI..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            />
          </div>
        </div>
        
        {/* Teaching Style Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Teaching Style</label>
          <div className="flex space-x-2">
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="teachingStyle"
                value="step-by-step"
                checked={teachingStyle === 'step-by-step'}
                onChange={(e) => setTeachingStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              📋 Step-by-Step
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="teachingStyle"
                value="socratic"
                checked={teachingStyle === 'socratic'}
                onChange={(e) => setTeachingStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              ❓ Socratic
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="teachingStyle"
                value="discovery-based"
                checked={teachingStyle === 'discovery-based'}
                onChange={(e) => setTeachingStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              🔍 Discovery
            </label>
          </div>
        </div>
        
        {/* Response Style Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Response Style</label>
          <div className="flex space-x-3">
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="responseStyle"
                value="detailed"
                checked={responseStyle === 'detailed'}
                onChange={(e) => setResponseStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              📝 Detailed (recommended)
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="responseStyle"
                value="concise"
                checked={responseStyle === 'concise'}
                onChange={(e) => setResponseStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              ⚡ Concise
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!topic.trim() || !goal.trim() || isCreating}
            className="bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              </div>
            ) : (
              'Start Learning'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Memoized markdown components to prevent re-creation on every render
const createMarkdownComponents = (isUserMessage = false) => {
  const baseColor = isUserMessage ? 'text-white' : 'text-gray-900';
  const codeColor = isUserMessage ? 'bg-blue-700 text-blue-100' : 'bg-gray-100 text-gray-800';
  
  return {
    h1: ({ children }: MarkdownComponentProps) => <h1 className={`text-xl font-bold mb-3 ${baseColor}`}>{children}</h1>,
    h2: ({ children }: MarkdownComponentProps) => <h2 className={`text-lg font-bold mb-2 ${baseColor}`}>{children}</h2>,
    h3: ({ children }: MarkdownComponentProps) => <h3 className={`text-base font-semibold mb-2 ${baseColor}`}>{children}</h3>,
    h4: ({ children }: MarkdownComponentProps) => <h4 className={`text-sm font-semibold mb-1 ${isUserMessage ? 'text-white' : 'text-gray-800'}`}>{children}</h4>,
    p: ({ children }: MarkdownComponentProps) => <p className={`mb-3 last:mb-0 leading-relaxed ${baseColor}`}>{children}</p>,
    strong: ({ children }: MarkdownComponentProps) => <strong className={`font-semibold ${baseColor}`}>{children}</strong>,
    em: ({ children }: MarkdownComponentProps) => <em className={`italic ${baseColor}`}>{children}</em>,
    ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>,
    ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>,
    li: ({ children }: MarkdownComponentProps) => <li className={`text-sm leading-relaxed ${baseColor}`}>{children}</li>,
    code: ({ children }: MarkdownComponentProps) => (
      <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${codeColor}`}>
        {children}
      </code>
    ),
    pre: ({ children }: MarkdownComponentProps) => (
      <pre className={`p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3 ${codeColor}`}>
        {children}
      </pre>
    ),
    blockquote: ({ children }: MarkdownComponentProps) => (
      <blockquote className={`border-l-4 pl-4 py-2 mb-3 italic ${isUserMessage ? 'border-blue-300 text-blue-100 bg-blue-700/20' : 'border-gray-300 text-gray-700 bg-gray-50'}`}>
        {children}
      </blockquote>
    ),
    hr: () => <hr className={`my-4 border-t ${isUserMessage ? 'border-blue-300' : 'border-gray-300'}`} />,
    table: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto mb-3">
        <table className={`min-w-full border-collapse ${isUserMessage ? 'border-blue-300' : 'border-gray-300'}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: MarkdownComponentProps) => <thead className={isUserMessage ? 'bg-blue-700/30' : 'bg-gray-50'}>{children}</thead>,
    tbody: ({ children }: MarkdownComponentProps) => <tbody>{children}</tbody>,
    tr: ({ children }: MarkdownComponentProps) => <tr className={`border-t ${isUserMessage ? 'border-blue-300' : 'border-gray-200'}`}>{children}</tr>,
    th: ({ children }: MarkdownComponentProps) => <th className={`px-3 py-2 text-left text-xs font-semibold ${baseColor}`}>{children}</th>,
    td: ({ children }: MarkdownComponentProps) => <td className={`px-3 py-2 text-xs ${isUserMessage ? 'text-blue-100' : 'text-gray-700'}`}>{children}</td>,
    a: ({ children, href }: AnchorComponentProps) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`underline hover:no-underline ${isUserMessage ? 'text-blue-200' : 'text-blue-600'}`}
      >
        {children}
      </a>
    )
  };
};

// Memoized components for performance
const userMarkdownComponents = createMarkdownComponents(true);
const assistantMarkdownComponents = createMarkdownComponents(false);

// Memoized message parsing function
const parseAgentMessage = (content: string): ParsedMessagePart[] => {
  if (!content.includes('[AGENT_SEPARATOR]')) {
    return [{
      agentName: 'AI Tutor',
      agentIcon: '🤖',
      agentColor: 'bg-blue-50 border-blue-200',
      agentTextColor: 'text-blue-900',
      content
    }];
  }

  const parts = content.split('[AGENT_SEPARATOR]').map(part => part.trim()).filter(part => part.length > 0);
  
  return parts.map((part) => {
    // Simplified agent detection with better performance
    if (part.includes('[LEARNING_PLAN_AGENT_START]')) {
      const startIndex = part.indexOf('[LEARNING_PLAN_AGENT_START]') + '[LEARNING_PLAN_AGENT_START]'.length;
      const endIndex = part.indexOf('[LEARNING_PLAN_AGENT_END]');
      const cleanContent = endIndex > startIndex ? part.substring(startIndex, endIndex).trim() : part.replace(/\[LEARNING_PLAN_AGENT_(START|END)\]/g, '').trim();
      
      return {
        agentName: 'Learning Plan Agent',
        agentIcon: '🎯',
        agentColor: 'bg-indigo-50 border-indigo-200',
        agentTextColor: 'text-indigo-900',
        content: cleanContent || 'Content could not be displayed properly.'
      };
    }
    
    if (part.includes('[TEACHING_AGENT_START]')) {
      const startIndex = part.indexOf('[TEACHING_AGENT_START]') + '[TEACHING_AGENT_START]'.length;
      const endIndex = part.indexOf('[TEACHING_AGENT_END]');
      const cleanContent = endIndex > startIndex ? part.substring(startIndex, endIndex).trim() : part.replace(/\[TEACHING_AGENT_(START|END)\]/g, '').trim();
      
      return {
        agentName: 'Teaching Agent',
        agentIcon: '📚',
        agentColor: 'bg-emerald-50 border-emerald-200',
        agentTextColor: 'text-emerald-900',
        content: cleanContent || 'Content could not be displayed properly.'
      };
    }
    
    // Fallback detection
    if (part.includes('🎯') || part.toLowerCase().includes('learning plan agent')) {
      return {
        agentName: 'Learning Plan Agent',
        agentIcon: '🎯',
        agentColor: 'bg-indigo-50 border-indigo-200',
        agentTextColor: 'text-indigo-900',
        content: part
      };
    }
    
    if (part.includes('📚') || part.toLowerCase().includes('teaching agent')) {
      return {
        agentName: 'Teaching Agent',
        agentIcon: '📚',
        agentColor: 'bg-emerald-50 border-emerald-200',
        agentTextColor: 'text-emerald-900',
        content: part
      };
    }
    
    return {
      agentName: 'AI Tutor',
      agentIcon: '🤖',
      agentColor: 'bg-blue-50 border-blue-200',
      agentTextColor: 'text-blue-900',
      content: part
    };
  });
};

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading,
  isCreatingPlan,
  showSessionSelector,
  onCreateSession,
  sessions,
  onSelectSession
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Session creation form state
  const [isCreating, setIsCreating] = useState(false);

  // Optimized auto-scroll with throttling
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Throttled scroll effect to prevent excessive scrolling
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom]); // Only depend on message count, not entire messages array

  // Memoize parsed messages to prevent re-parsing on every render
  const parsedMessages = useMemo(() => {
    return messages.map((message): ParsedMessage => {
      if (message.role === 'assistant') {
        // Parse the agent message content (removed truncation)
        const parsedParts = parseAgentMessage(message.content);
        return {
          ...message,
          parsedParts
        };
      }
      return message;
    });
  }, [messages]);

  // Show only recent messages for performance (virtual scrolling effect)
  const displayMessages = useMemo(() => {
    // For conversations with many messages, only show the latest 50
    if (parsedMessages.length > 50) {
      return parsedMessages.slice(-50);
    }
    return parsedMessages;
  }, [parsedMessages]);

  // Handle session creation
  const handleCreateSession = async (topic: string, goal: string, teachingStyle: string, responseStyle: string) => {
    setIsCreating(true);
    try {
      await onCreateSession(topic, goal, teachingStyle, responseStyle);
    } catch (error) {
      console.error('ChatInterface handleCreateSession error:', error);
      // Re-throw the error so the form can handle it
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  // Handle session selection
  const handleSelectSession = async (session: Session) => {
    try {
      await onSelectSession(session);
    } catch (error) {
      console.error('Error selecting session:', error);
    }
  };

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

  // SessionSelector Component
  const SessionSelector = () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">AI Tutor</h2>
          <p className="text-gray-600 text-sm">
            Your personalized learning companion
          </p>
        </div>

        {/* Create New Session Section - Enhanced with Goal */}
        <SessionCreationForm 
          onCreateSession={handleCreateSession} 
          isCreating={isCreating} 
        />

        {/* Previous Sessions Section - Compact List */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">📚 Continue Previous Sessions</h3>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    handleSelectSession(session);
                  }}
                  className="p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all hover:bg-blue-50 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-900">
                        {session.topic}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {session.teachingStyle.replace('-', ' ')} • {session.responseStyle} • {formatDate(session.updatedAt)}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-900">
                        {Math.round(session.completionRate)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Compact progress bar */}
                  <div className="mt-2 bg-gray-200 rounded-full h-1 group-hover:bg-blue-100">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300 group-hover:bg-blue-700"
                      style={{ width: `${session.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (showSessionSelector) {
    return <SessionSelector />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-600">
              Send a message to start your learning session!
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Try: "I want to learn React hooks" or "Teach me about machine learning"
            </p>
          </div>
        ) : (
          <>
            {/* Show truncation warning if needed */}
            {parsedMessages.length > 50 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-sm text-yellow-800">
                    Showing latest 50 messages for optimal performance. 
                    {parsedMessages.length - 50} earlier messages are hidden.
                  </span>
                </div>
              </div>
            )}
            
            {displayMessages.map((message) => {
            if (message.role === 'user') {
              // User message bubble - simplified
              return (
                <div
                  key={message.id}
                  className="flex justify-end mb-4"
                >
                  <div className="bg-blue-600 text-white max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="text-sm markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={userMarkdownComponents}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <div className="text-xs mt-1 text-blue-100">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Assistant message - use pre-parsed data
            if (message.parsedParts && message.parsedParts.length > 1) {
              // Multi-part agent message
              return message.parsedParts.map((part: ParsedMessagePart, index: number) => (
                <div
                  key={`${message.id}-part-${index}`}
                  className="flex justify-start mb-6"
                >
                  <div className="w-full max-w-none">
                    {/* Agent Header */}
                    <div className={`${part.agentColor} border rounded-t-lg px-4 py-2 flex items-center space-x-2`}>
                      <span className="text-lg">{part.agentIcon}</span>
                      <span className={`font-semibold text-sm ${part.agentTextColor}`}>{part.agentName}</span>
                      <span className="text-xs text-gray-600">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {/* Message Content */}
                    <div className="bg-white border border-t-0 rounded-b-lg px-4 py-3">
                      <div className="text-sm markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={assistantMarkdownComponents}
                        >
                          {part.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            }
            
            // Single agent message
            const part = message.parsedParts?.[0] || {
              agentName: 'AI Tutor',
              agentIcon: '🤖',
              agentColor: 'bg-gray-50 border-gray-200',
              agentTextColor: 'text-gray-900',
              content: message.content
            };
            
            return (
              <div
                key={message.id}
                className="flex justify-start mb-4"
              >
                <div className="w-full max-w-none">
                  <div className={`${part.agentColor} border rounded-t-lg px-4 py-2 flex items-center space-x-2`}>
                    <span className="text-lg">{part.agentIcon}</span>
                    <span className={`font-semibold text-sm ${part.agentTextColor}`}>{part.agentName}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg px-4 py-3">
                    <div className="text-sm markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={assistantMarkdownComponents}
                      >
                        {part.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
                         );
           }).flat()}
          </>
        )}

        {/* Progressive Loading Indicators - Revolut-inspired design */}
        
        {/* Step 1: Creating Learning Plan */}
        {isCreatingPlan && (
          <div className="w-full flex justify-center py-6">
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border border-blue-100 rounded-2xl px-8 py-6 shadow-sm max-w-lg w-full">
              <div className="flex items-center justify-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-900 mb-1">AI Tutor creates learning plan for you</div>
                  <div className="text-sm text-blue-700">Analyzing concepts and designing practice tasks</div>
                  <div className="mt-2 flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Loading (for single agent responses) */}
        {isLoading && !isCreatingPlan && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600 ml-2">AI Tutor is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length === 0 
                ? "What would you like to learn today?" 
                : "Type your response..."
            }
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        <div className="mt-1 text-xs text-gray-600 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
} 