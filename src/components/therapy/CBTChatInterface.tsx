'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReactNode } from 'react';

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

interface ParsedTherapyMessagePart {
  agentName: string;
  agentIcon: string;
  agentColor: string;
  agentTextColor: string;
  content: string;
}

interface ParsedTherapyMessage extends TherapyMessage {
  parsedParts?: ParsedTherapyMessagePart[];
}

interface CBTChatInterfaceProps {
  messages: TherapyMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isCreatingPlan: boolean;
  showSessionSelector: boolean;
  onCreateSession: (primaryConcern: string, therapyGoal: string, therapyStyle: string, sessionType: string) => Promise<void>;
  sessions: TherapySession[];
  onSelectSession: (session: TherapySession) => Promise<void>;
}

// Type definitions for ReactMarkdown components
interface MarkdownComponentProps {
  children?: ReactNode;
}

interface AnchorComponentProps extends MarkdownComponentProps {
  href?: string;
}

// Simple, isolated therapy session creation form component
function TherapySessionCreationForm({ 
  onCreateSession, 
  isCreating 
}: { 
  onCreateSession: (primaryConcern: string, therapyGoal: string, therapyStyle: string, sessionType: string) => Promise<void>;
  isCreating: boolean;
}) {
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [therapyGoal, setTherapyGoal] = useState('');
  const [therapyStyle, setTherapyStyle] = useState('cognitive-behavioral');
  const [sessionType, setSessionType] = useState('assessment');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryConcern.trim() || !therapyGoal.trim() || isCreating) return;
    
    await onCreateSession(primaryConcern.trim(), therapyGoal.trim(), therapyStyle, sessionType);
    setPrimaryConcern('');
    setTherapyGoal('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-gray-700">Share what you'd like to work on and your goals</p>
          <p className="text-xs text-gray-500 mt-1">Remember: This is educational CBT guidance, not professional therapy</p>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              What would you like to work on?
            </label>
            <input
              type="text"
              value={primaryConcern}
              onChange={(e) => setPrimaryConcern(e.target.value)}
              placeholder="e.g., anxiety, stress management, negative thinking patterns..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              What's your goal for working on this?
            </label>
            <input
              type="text"
              value={therapyGoal}
              onChange={(e) => setTherapyGoal(e.target.value)}
              placeholder="e.g., feel more confident, manage stress better, improve relationships..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            />
          </div>
        </div>
        
        {/* Therapy Style Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Therapy Approach</label>
          <div className="flex space-x-2">
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="therapyStyle"
                value="cognitive-behavioral"
                checked={therapyStyle === 'cognitive-behavioral'}
                onChange={(e) => setTherapyStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              🧠 CBT (recommended)
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="therapyStyle"
                value="mindfulness-based"
                checked={therapyStyle === 'mindfulness-based'}
                onChange={(e) => setTherapyStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              🧘 Mindfulness
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="therapyStyle"
                value="solution-focused"
                checked={therapyStyle === 'solution-focused'}
                onChange={(e) => setTherapyStyle(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              🎯 Solution-Focused
            </label>
          </div>
        </div>
        
        {/* Session Type Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Session Type</label>
          <div className="flex space-x-3">
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="sessionType"
                value="assessment"
                checked={sessionType === 'assessment'}
                onChange={(e) => setSessionType(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              📋 Assessment (recommended)
            </label>
            
            <label className="flex items-center text-xs">
              <input
                type="radio"
                name="sessionType"
                value="therapy"
                checked={sessionType === 'therapy'}
                onChange={(e) => setSessionType(e.target.value)}
                className="mr-1"
                disabled={isCreating}
              />
              💬 Therapy
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!primaryConcern.trim() || !therapyGoal.trim() || isCreating}
            className="bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? (
              <>
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                Creating Session...
              </>
            ) : (
              'Start CBT Session'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Create markdown components specifically for therapy content
const createTherapyMarkdownComponents = (isUserMessage = false) => {
  return {
    h1: ({ children }: MarkdownComponentProps) => (
      <h1 className={`text-xl font-bold mb-4 ${isUserMessage ? 'text-blue-900' : 'text-gray-900'}`}>
        {children}
      </h1>
    ),
    h2: ({ children }: MarkdownComponentProps) => (
      <h2 className={`text-lg font-semibold mb-3 ${isUserMessage ? 'text-blue-800' : 'text-gray-800'}`}>
        {children}
      </h2>
    ),
    h3: ({ children }: MarkdownComponentProps) => (
      <h3 className={`text-base font-medium mb-2 ${isUserMessage ? 'text-blue-700' : 'text-gray-700'}`}>
        {children}
      </h3>
    ),
    p: ({ children }: MarkdownComponentProps) => (
      <p className={`mb-3 leading-relaxed ${isUserMessage ? 'text-blue-800' : 'text-gray-700'}`}>
        {children}
      </p>
    ),
    ul: ({ children }: MarkdownComponentProps) => (
      <ul className={`mb-3 ml-4 space-y-1 ${isUserMessage ? 'text-blue-800' : 'text-gray-700'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }: MarkdownComponentProps) => (
      <ol className={`mb-3 ml-4 space-y-1 list-decimal ${isUserMessage ? 'text-blue-800' : 'text-gray-700'}`}>
        {children}
      </ol>
    ),
    li: ({ children }: MarkdownComponentProps) => (
      <li className="list-disc">{children}</li>
    ),
    strong: ({ children }: MarkdownComponentProps) => (
      <strong className={`font-semibold ${isUserMessage ? 'text-blue-900' : 'text-gray-900'}`}>
        {children}
      </strong>
    ),
    code: ({ children }: MarkdownComponentProps) => (
      <code className={`px-1 py-0.5 rounded text-sm font-mono ${
        isUserMessage ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'
      }`}>
        {children}
      </code>
    ),
    blockquote: ({ children }: MarkdownComponentProps) => (
      <blockquote className={`border-l-4 pl-4 my-3 italic ${
        isUserMessage ? 'border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600'
      }`}>
        {children}
      </blockquote>
    ),
    a: ({ children, href }: AnchorComponentProps) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`underline hover:no-underline ${
          isUserMessage ? 'text-blue-600 hover:text-blue-800' : 'text-blue-600 hover:text-blue-800'
        }`}
      >
        {children}
      </a>
    ),
    table: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: MarkdownComponentProps) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    tbody: ({ children }: MarkdownComponentProps) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }: MarkdownComponentProps) => (
      <tr className="border-b border-gray-200">{children}</tr>
    ),
    th: ({ children }: MarkdownComponentProps) => (
      <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-900 bg-gray-50">
        {children}
      </th>
    ),
    td: ({ children }: MarkdownComponentProps) => (
      <td className="border border-gray-300 px-4 py-2 text-gray-700">
        {children}
      </td>
    ),
  };
};

// Parse therapy agent messages
const parseTherapyAgentMessage = (content: string): ParsedTherapyMessagePart[] => {
  const parts: ParsedTherapyMessagePart[] = [];
  
  // Check for CBT Assessment Agent
  const assessmentMatch = content.match(/\[CBT_ASSESSMENT_AGENT_START\](.*?)\[CBT_ASSESSMENT_AGENT_END\]/s);
  if (assessmentMatch) {
    parts.push({
      agentName: 'CBT Assessment Agent',
      agentIcon: '🧠',
      agentColor: 'bg-purple-50 border-purple-200',
      agentTextColor: 'text-purple-800',
      content: assessmentMatch[1].trim()
    });
  }
  
  // Check for Cognitive Restructuring Agent
  const cognitiveMatch = content.match(/\[COGNITIVE_RESTRUCTURING_AGENT_START\](.*?)\[COGNITIVE_RESTRUCTURING_AGENT_END\]/s);
  if (cognitiveMatch) {
    parts.push({
      agentName: 'Cognitive Restructuring Agent',
      agentIcon: '🧩',
      agentColor: 'bg-indigo-50 border-indigo-200',
      agentTextColor: 'text-indigo-800',
      content: cognitiveMatch[1].trim()
    });
  }
  
  // Check for CBT Psychotherapist
  const therapistMatch = content.match(/\[CBT_PSYCHOTHERAPIST_START\](.*?)\[CBT_PSYCHOTHERAPIST_END\]/s);
  if (therapistMatch) {
    parts.push({
      agentName: 'CBT Psychotherapist',
      agentIcon: '💙',
      agentColor: 'bg-blue-50 border-blue-200',
      agentTextColor: 'text-blue-800',
      content: therapistMatch[1].trim()
    });
  }
  
  // If no agent markers found, treat as single CBT response
  if (parts.length === 0) {
    // Check for manual agent identification
    if (content.includes('🧠 **CBT Assessment Agent**')) {
      parts.push({
        agentName: 'CBT Assessment Agent',
        agentIcon: '🧠',
        agentColor: 'bg-purple-50 border-purple-200',
        agentTextColor: 'text-purple-800',
        content: content.replace('🧠 **CBT Assessment Agent**', '').trim()
      });
    } else if (content.includes('🧩 **Cognitive Restructuring Agent**')) {
      parts.push({
        agentName: 'Cognitive Restructuring Agent',
        agentIcon: '🧩',
        agentColor: 'bg-indigo-50 border-indigo-200',
        agentTextColor: 'text-indigo-800',
        content: content.replace('🧩 **Cognitive Restructuring Agent**', '').trim()
      });
    } else if (content.includes('🧠 **CBT Psychotherapist**')) {
      parts.push({
        agentName: 'CBT Psychotherapist',
        agentIcon: '💙',
        agentColor: 'bg-blue-50 border-blue-200',
        agentTextColor: 'text-blue-800',
        content: content.replace('🧠 **CBT Psychotherapist**', '').trim()
      });
    } else {
      // Default to CBT Psychotherapist for unidentified content
      parts.push({
        agentName: 'CBT Psychotherapist',
        agentIcon: '💙',
        agentColor: 'bg-blue-50 border-blue-200',
        agentTextColor: 'text-blue-800',
        content: content
      });
    }
  }
  
  return parts;
};

export function CBTChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading,
  isCreatingPlan,
  showSessionSelector,
  onCreateSession,
  sessions,
  onSelectSession
}: CBTChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse messages with therapy agent identification
  const parsedMessages: ParsedTherapyMessage[] = useMemo(() => {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    return messages.map(message => ({
      ...message,
      parsedParts: message.role === 'assistant' ? parseTherapyAgentMessage(message.content) : undefined
    }));
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [parsedMessages, scrollToBottom]);

  const handleCreateSession = async (primaryConcern: string, therapyGoal: string, therapyStyle: string, sessionType: string) => {
    try {
      await onCreateSession(primaryConcern, therapyGoal, therapyStyle, sessionType);
    } catch (error) {
      console.error('Error creating therapy session:', error);
    }
  };

  const handleSelectSession = async (session: TherapySession) => {
    try {
      await onSelectSession(session);
    } catch (error) {
      console.error('Error selecting therapy session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const TherapySessionSelector = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Choose a therapy session</h3>
      </div>
      
      {sessions.length > 0 && (
        <div className="mb-4 max-h-40 overflow-y-auto">
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border text-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {session.primaryConcern}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {session.therapyGoal && (
                        <span>Goal: {session.therapyGoal} • </span>
                      )}
                      Progress: {Math.round(session.progressLevel)}%
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-xs text-gray-500">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <TherapySessionCreationForm 
        onCreateSession={handleCreateSession}
        isCreating={isCreatingPlan}
      />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showSessionSelector ? (
          <TherapySessionSelector />
        ) : (
          <>
            {parsedMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.role === 'user' ? (
                    <div className="bg-blue-600 text-white rounded-lg px-4 py-3 shadow-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={createTherapyMarkdownComponents(true)}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {message.parsedParts?.map((part, index) => (
                        <div key={index}>
                          {/* Agent Transfer Indicator */}
                          {index > 0 && (
                            <div className="flex items-center justify-center my-4">
                              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full border text-xs text-gray-600">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span>Agent Transfer</span>
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </div>
                            </div>
                          )}
                          
                          {/* Agent Message */}
                          <div className={`rounded-lg px-4 py-3 shadow-sm border ${part.agentColor} transition-all duration-300 hover:shadow-md`}>
                            <div className={`flex items-center mb-2 text-sm font-medium ${part.agentTextColor}`}>
                              <span className="mr-2">{part.agentIcon}</span>
                              {part.agentName}
                              {index === 0 && message.parsedParts && message.parsedParts.length > 1 && (
                                <span className="ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">
                                  Step {index + 1} of {message.parsedParts.length}
                                </span>
                              )}
                            </div>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={createTherapyMarkdownComponents(false)}
                            >
                              {part.content}
                            </ReactMarkdown>
                            
                            {/* Continuation Indicator */}
                            {index < (message.parsedParts?.length || 0) - 1 && (
                              <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs text-gray-500 flex items-center space-x-1">
                                  <span>Continuing with</span>
                                  <span className="font-medium">
                                    {message.parsedParts?.[index + 1]?.agentName}
                                  </span>
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )) || (
                        <div className="bg-blue-50 border-blue-200 rounded-lg px-4 py-3 shadow-sm border">
                          <div className="flex items-center mb-2 text-sm font-medium text-blue-800">
                            <span className="mr-2">💙</span>
                            CBT Psychotherapist
                          </div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={createTherapyMarkdownComponents(false)}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-50 border-blue-200 rounded-lg px-4 py-3 shadow-sm border max-w-[85%]">
                  <div className="flex items-center mb-2 text-sm font-medium text-blue-800">
                    <span className="mr-2">💙</span>
                    CBT Psychotherapist
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm text-blue-700 ml-2">Providing CBT guidance...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {!showSessionSelector && (
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts, feelings, or questions..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                height: Math.min(120, Math.max(40, inputMessage.split('\n').length * 20 + 20))
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Remember: This is educational CBT guidance, not professional therapy. 
            <span className="block mt-1">If you're in crisis, please contact emergency services or a mental health professional.</span>
          </div>
        </div>
      )}
    </div>
  );
} 