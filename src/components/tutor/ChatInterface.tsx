'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isCreatingPlan: boolean;
  showSessionSelector: boolean;
  onCreateSession: (topic: string, teachingStyle: string) => Promise<void>;
  sessions: Session[];
  onSelectSession: (session: Session) => Promise<void>;
}

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

  // Session creation form state
  const [newTopic, setNewTopic] = useState('');
  const [newTeachingStyle, setNewTeachingStyle] = useState('step-by-step');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-scroll to latest message (not bottom) when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessageElement = document.querySelector(`[data-message-id="${messages[messages.length - 1].id}"]`);
      if (latestMessageElement) {
        latestMessageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback to scrolling to bottom if element not found
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Handle session creation
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTopic.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateSession(newTopic.trim(), newTeachingStyle);
      setNewTopic('');
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

        {/* Create New Session Section - Compact */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <form onSubmit={handleCreateSession} className="space-y-3">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="What would you like to learn? (e.g., React Hooks, Machine Learning...)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
              autoFocus
            />
            
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2 flex-1">
                <label className="flex items-center text-xs">
                  <input
                    type="radio"
                    name="teachingStyle"
                    value="step-by-step"
                    checked={newTeachingStyle === 'step-by-step'}
                    onChange={(e) => setNewTeachingStyle(e.target.value)}
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
                    checked={newTeachingStyle === 'socratic'}
                    onChange={(e) => setNewTeachingStyle(e.target.value)}
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
                    checked={newTeachingStyle === 'discovery-based'}
                    onChange={(e) => setNewTeachingStyle(e.target.value)}
                    className="mr-1"
                    disabled={isCreating}
                  />
                  🔍 Discovery
                </label>
              </div>
              
              <button
                type="submit"
                disabled={!newTopic.trim() || isCreating}
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
                        {session.teachingStyle.replace('-', ' ')} • {formatDate(session.updatedAt)}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-600">
              Send a message to start your learning session!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Try: "I want to learn React hooks" or "Teach me about machine learning"
            </p>
          </div>
        ) : (
          messages.map((message) => {
            // Check if this is a combined agent message (contains "[AGENT_SEPARATOR]")
            if (message.role === 'assistant' && message.content.includes('[AGENT_SEPARATOR]')) {
              try {
                const parts = message.content.split('[AGENT_SEPARATOR]').map(part => part.trim()).filter(part => part.length > 0);
                
                return parts.map((part, index) => {
                  // Robust agent detection using explicit markers
                  let agentName = 'AI Tutor';
                  let agentIcon = '🤖';
                  let agentColor = 'bg-blue-50 border-blue-200';
                  let agentTextColor = 'text-blue-900';
                  let cleanContent = part;
                  
                  // Detect and clean Learning Plan Agent content
                  if (part.includes('[LEARNING_PLAN_AGENT_START]') && part.includes('[LEARNING_PLAN_AGENT_END]')) {
                    agentName = 'Learning Plan Agent';
                    agentIcon = '🎯';
                    agentColor = 'bg-indigo-50 border-indigo-200';
                    agentTextColor = 'text-indigo-900';
                    
                    // Extract content between markers
                    const startMarker = '[LEARNING_PLAN_AGENT_START]';
                    const endMarker = '[LEARNING_PLAN_AGENT_END]';
                    const startIndex = part.indexOf(startMarker) + startMarker.length;
                    const endIndex = part.indexOf(endMarker);
                    
                    if (startIndex > startMarker.length - 1 && endIndex > startIndex) {
                      cleanContent = part.substring(startIndex, endIndex).trim();
                    } else {
                      // Fallback: remove markers manually
                      cleanContent = part.replace('[LEARNING_PLAN_AGENT_START]', '').replace('[LEARNING_PLAN_AGENT_END]', '').trim();
                    }
                  }
                  // Detect and clean Teaching Agent content
                  else if (part.includes('[TEACHING_AGENT_START]') && part.includes('[TEACHING_AGENT_END]')) {
                    agentName = 'Teaching Agent';
                    agentIcon = '📚';
                    agentColor = 'bg-emerald-50 border-emerald-200';
                    agentTextColor = 'text-emerald-900';
                    
                    // Extract content between markers
                    const startMarker = '[TEACHING_AGENT_START]';
                    const endMarker = '[TEACHING_AGENT_END]';
                    const startIndex = part.indexOf(startMarker) + startMarker.length;
                    const endIndex = part.indexOf(endMarker);
                    
                    if (startIndex > startMarker.length - 1 && endIndex > startIndex) {
                      cleanContent = part.substring(startIndex, endIndex).trim();
                    } else {
                      // Fallback: remove markers manually
                      cleanContent = part.replace('[TEACHING_AGENT_START]', '').replace('[TEACHING_AGENT_END]', '').trim();
                    }
                  }
                  // Fallback detection for backward compatibility
                  else if (part.includes('🎯') || part.toLowerCase().includes('learning plan agent')) {
                    agentName = 'Learning Plan Agent';
                    agentIcon = '🎯';
                    agentColor = 'bg-indigo-50 border-indigo-200';
                    agentTextColor = 'text-indigo-900';
                  } else if (part.includes('📚') || part.toLowerCase().includes('teaching agent')) {
                    agentName = 'Teaching Agent';
                    agentIcon = '📚';
                    agentColor = 'bg-emerald-50 border-emerald-200';
                    agentTextColor = 'text-emerald-900';
                  }
                  
                  // Validate content length to prevent rendering issues
                  if (cleanContent.length > 10000) {
                    console.warn('Agent content is very long, may impact performance');
                  }
                  
                  // Safety check for empty content
                  if (!cleanContent || cleanContent.trim().length === 0) {
                    cleanContent = 'Content could not be displayed properly.';
                  }
                  
                  return (
                    <div
                      key={`${message.id}-part-${index}`}
                      data-message-id={`${message.id}-part-${index}`}
                      className="flex justify-start mb-6"
                    >
                      <div className="w-full max-w-none">
                        {/* Agent Header */}
                        <div className={`${agentColor} border rounded-t-lg px-4 py-2 flex items-center space-x-2`}>
                          <span className="text-lg">{agentIcon}</span>
                          <span className={`font-semibold text-sm ${agentTextColor}`}>{agentName}</span>
                          <span className="text-xs text-gray-500">
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
                              components={{
                                // Headers with proper hierarchy
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-gray-900">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900">{children}</h3>,
                                h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 text-gray-800">{children}</h4>,
                                
                                // Paragraphs
                                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                                
                                // Text formatting
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                em: ({ children }) => <em className="italic text-gray-900">{children}</em>,
                                
                                // Lists
                                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                                
                                // Code
                                code: ({ children }) => (
                                  <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-800">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children }) => (
                                  <pre className="p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3 bg-gray-100 text-gray-800">
                                    {children}
                                  </pre>
                                ),
                                
                                // Blockquotes
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 pl-4 py-2 mb-3 italic border-gray-300 text-gray-700 bg-gray-50">
                                    {children}
                                  </blockquote>
                                ),
                                
                                // Horizontal rules
                                hr: () => <hr className="my-4 border-t border-gray-300" />,
                                
                                // Tables
                                table: ({ children }) => (
                                  <div className="overflow-x-auto mb-3">
                                    <table className="min-w-full border-collapse border-gray-300">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr className="border-t border-gray-200">{children}</tr>,
                                th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">{children}</th>,
                                td: ({ children }) => <td className="px-3 py-2 text-xs text-gray-700">{children}</td>,
                                
                                // Links
                                a: ({ children, href }) => (
                                  <a 
                                    href={href} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="underline hover:no-underline text-blue-600"
                                  >
                                    {children}
                                  </a>
                                )
                              }}
                            >
                              {cleanContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              } catch (error) {
                console.error('Error parsing combined agent message:', error);
                // Fallback to single message display if parsing fails
                return (
                  <div
                    key={message.id}
                    data-message-id={message.id}
                    className="flex justify-start mb-4"
                  >
                    <div className="w-full max-w-none">
                      <div className="bg-red-50 border border-red-200 rounded-t-lg px-4 py-2 flex items-center space-x-2">
                        <span className="text-lg">⚠️</span>
                        <span className="font-semibold text-sm text-red-900">Message Parsing Error</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="bg-white border border-t-0 border-red-200 rounded-b-lg px-4 py-3">
                        <div className="text-sm text-gray-700">
                          There was an error displaying this message. Raw content:
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                            {message.content.substring(0, 1000)}
                            {message.content.length > 1000 ? '...' : ''}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            }
            
            // Regular single message handling (user messages or single agent responses)
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {message.role === 'user' ? (
                  // User message bubble
                  <div className="bg-blue-600 text-white max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="text-sm markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Headers with proper hierarchy
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 text-white">{children}</h4>,
                          
                          // Paragraphs
                          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                          
                          // Text formatting
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white">{children}</em>,
                          
                          // Lists
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>,
                          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                          
                          // Code
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-blue-700 text-blue-100">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3 bg-blue-700 text-blue-100">
                              {children}
                            </pre>
                          ),
                          
                          // Blockquotes
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 pl-4 py-2 mb-3 italic border-blue-300 text-blue-100 bg-blue-700/20">
                              {children}
                            </blockquote>
                          ),
                          
                          // Horizontal rules
                          hr: () => <hr className="my-4 border-t border-blue-300" />,
                          
                          // Tables
                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-3">
                              <table className="min-w-full border-collapse border-blue-300">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-blue-700/30">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-t border-blue-300">{children}</tr>,
                          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-white">{children}</th>,
                          td: ({ children }) => <td className="px-3 py-2 text-xs text-blue-100">{children}</td>,
                          
                          // Links
                          a: ({ children, href }) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:no-underline text-blue-200"
                            >
                              {children}
                            </a>
                          )
                        }}
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
                ) : (
                  // Single agent message (fallback)
                  <div className="w-full max-w-none">
                    <div className="bg-gray-50 border border-gray-200 rounded-t-lg px-4 py-2 flex items-center space-x-2">
                      <span className="text-lg">🤖</span>
                      <span className="font-semibold text-sm text-gray-900">AI Tutor</span>
                      <span className="text-xs text-gray-500">
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
                          components={{
                            // Same components as above for consistency
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-gray-900">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-gray-900">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 text-gray-800">{children}</h4>,
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-900">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>,
                            li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                            code: ({ children }) => (
                              <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-800">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3 bg-gray-100 text-gray-800">
                                {children}
                              </pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 pl-4 py-2 mb-3 italic border-gray-300 text-gray-700 bg-gray-50">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="my-4 border-t border-gray-300" />,
                            table: ({ children }) => (
                              <div className="overflow-x-auto mb-3">
                                <table className="min-w-full border-collapse border-gray-300">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border-t border-gray-200">{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 text-xs text-gray-700">{children}</td>,
                            a: ({ children, href }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline hover:no-underline text-blue-600"
                              >
                                {children}
                              </a>
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }).flat() // Flatten the array since combined messages return arrays
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
                <span className="text-sm text-gray-500 ml-2">AI Tutor is thinking...</span>
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
        
        <div className="mt-1 text-xs text-gray-500 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
} 