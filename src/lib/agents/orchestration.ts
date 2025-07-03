import { prisma } from '../prisma';
import { LearningPlanAgent } from './learning-plan.agent';
import { TeacherAgent } from './teacher.agent';
import { createSimpleResponse } from './shared';

// =============================================================================
// AGENT ORCHESTRATION SYSTEM
// =============================================================================

// Create agent instances (singleton pattern)
const learningPlanAgent = new LearningPlanAgent();
const teacherAgent = new TeacherAgent();

// Agent selection logic
function needsLearningPlan(userMessage: string, context: any): boolean {
  // Use LearningPlanAgent if:
  // 1. No existing concepts in the session
  // 2. User explicitly requests new topic or learning plan
  // 3. User asks to start learning something new
  
  const hasNoConcepts = !context.conceptMap || context.conceptMap.length === 0;
  const requestsNewTopic = userMessage.toLowerCase().includes('learn') && 
                          (userMessage.toLowerCase().includes('about') || 
                           userMessage.toLowerCase().includes('new topic') ||
                           userMessage.toLowerCase().includes('start learning'));
  const requestsLearningPlan = userMessage.toLowerCase().includes('learning plan') ||
                              userMessage.toLowerCase().includes('create plan') ||
                              userMessage.toLowerCase().includes('learning path');
  
  return hasNoConcepts || requestsNewTopic || requestsLearningPlan;
}

// Response combination logic
function combineResponses(planResponse: string, teachResponse: string): string {
  return `[LEARNING_PLAN_AGENT_START]
${planResponse}
[LEARNING_PLAN_AGENT_END]

[AGENT_SEPARATOR]

[TEACHING_AGENT_START]
${teachResponse}
[TEACHING_AGENT_END]`;
}

// Main orchestration function
async function processUserMessage(
  sessionId: string, 
  userId: string, 
  message: string, 
  threadId: string
): Promise<{ response: string; success: boolean; error?: string }> {
  let context: any = null;
  
  try {
    // Get current session context
    console.log('🔄 Getting session context for orchestration...');
    context = await getSessionContext(sessionId, userId);
    console.log('🔄 Session context retrieved successfully');
    
    if (needsLearningPlan(message, context)) {
      console.log('🎯 Using LearningPlanAgent + TeacherAgent workflow');
      
      // Step 1: LearningPlanAgent creates structure
      const planStart = Date.now();
      const planResult = await learningPlanAgent.createLearningPlan(
        sessionId, 
        context.currentTopic, 
        context.currentGoal,
        context.teachingStyle,
        context.responseStyle, 
        threadId
      );
      console.log(`🎯 Learning plan created in ${Date.now() - planStart}ms`);
      
      // Step 2: TeacherAgent begins teaching
      const teachStart = Date.now();
      const teachingMessage = `Okay, I've reviewed the plan. Please start by explaining the first concept.`;
      
      // Refresh context to include newly created concepts
      const updatedContext = await getSessionContext(sessionId, userId);
      const teachResult = await teacherAgent.teach(
        sessionId,
        teachingMessage,
        updatedContext,
        threadId
      );
      console.log(`📚 Teaching response created in ${Date.now() - teachStart}ms`);
      
      // Combine responses
      const combinedResponse = combineResponses(planResult, teachResult);
      
      // Save the conversation
      await saveConversation(sessionId, message, combinedResponse);
      
      return {
        response: combinedResponse,
        success: true
      };
      
    } else {
      console.log('📚 Using TeacherAgent only');
      
      // Direct to TeacherAgent for ongoing teaching
      const teachStart = Date.now();
      const teachResult = await teacherAgent.teach(
        sessionId,
        message,
        context,
        threadId
      );
      console.log(`📚 Teaching response created in ${Date.now() - teachStart}ms`);
      
      // Save the conversation
      await saveConversation(sessionId, message, teachResult);
      
      return {
        response: teachResult,
        success: true
      };
    }
    
  } catch (error) {
    console.error('🔄 Error in agent orchestration:', error);
    
    // Fallback response
    if (context) {
      console.log('🔄 Using fallback response with context');
      try {
        const fallbackResponse = await createSimpleResponse(message, context);
        await saveConversation(sessionId, message, fallbackResponse);
        return {
          response: fallbackResponse,
          success: true
        };
      } catch (fallbackError) {
        console.error('🔄 Fallback response also failed:', fallbackError);
      }
    }
    
    // Last resort error response
    return {
      response: 'I apologize, but I encountered an error. Please try refreshing the page and starting a new learning session.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Function to get session context for the agent
async function getSessionContext(sessionId: string, userId: string) {
  try {
    console.log('Getting session context for:', { sessionId, userId });
    
    const session = await prisma.learningSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        user: { select: { email: true } },
        concepts: {
          orderBy: { orderIndex: 'asc' },
          include: { subConcepts: true }
        },
        tasks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      console.error('Session not found in database:', { sessionId, userId });
      throw new Error(`Session not found for user ${userId}`);
    }

    console.log('Found session:', {
      id: session.id,
      topic: session.topic,
      userEmail: session.user.email,
      conceptsCount: session.concepts.length,
      tasksCount: session.tasks.length
    });

    const completedTasks = session.tasks.filter(task => task.isCompleted);
    const pendingTasks = session.tasks.filter(task => !task.isCompleted);

    const context = {
      userEmail: session.user.email,
      currentTopic: session.topic,
      currentGoal: session.goal,
      teachingStyle: session.teachingStyle,
      responseStyle: session.responseStyle,
      conceptMap: session.concepts,
      completedTasks,
      pendingTasks,
      sessionProgress: session.completionRate
    };

    console.log('Returning session context:', {
      userEmail: context.userEmail,
      currentTopic: context.currentTopic,
      teachingStyle: context.teachingStyle,
      conceptsCount: context.conceptMap.length,
      completedTasksCount: context.completedTasks.length,
      pendingTasksCount: context.pendingTasks.length,
      sessionProgress: context.sessionProgress
    });

    return context;
  } catch (error) {
    console.error('Error getting session context:', error);
    throw error; // Don't use fallback here, let the caller handle it
  }
}

// Save conversation (both user and assistant messages)
async function saveConversation(sessionId: string, userMessage: string, assistantMessage: string): Promise<void> {
  try {
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId,
          content: userMessage,
          role: 'user'
        },
        {
          sessionId,
          content: assistantMessage,
          role: 'assistant'
        }
      ]
    });
    console.log('💾 Conversation saved to database');
  } catch (error) {
    console.error('💾 Error saving conversation:', error);
  }
}

// =============================================================================
// MAIN CHAT FUNCTION - UPDATED FOR DUAL-AGENT SYSTEM
// =============================================================================

// Main chat function that uses the dual-agent orchestration
export async function chatWithAgent(
  sessionId: string,
  userId: string,
  message: string,
  threadId: string
) {
  console.log('🚀 Starting dual-agent chat system...');
  const totalStart = Date.now();
  
  try {
    const result = await processUserMessage(sessionId, userId, message, threadId);
    
    const totalElapsed = Date.now() - totalStart;
    console.log(`🚀 Total dual-agent response time: ${totalElapsed}ms`);
    
    return result;
    
  } catch (error) {
    console.error('🚀 Critical error in dual-agent system:', error);
    
    // Ultimate fallback
    return {
      response: 'I apologize, but I encountered a technical issue. Please try refreshing the page and starting a new learning session.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 