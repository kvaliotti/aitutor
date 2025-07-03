import { prisma } from '../prisma';
import { CBTAssessmentAgent } from './cbt-assessment.agent';
import { CBTPsychotherapistAgent } from './cbt-psychotherapist.agent';
import { CognitiveRestructuringAgent } from './cognitive-restructuring.agent';
import { createSimpleResponse } from './shared';

// =============================================================================
// CBT AGENT ORCHESTRATION SYSTEM
// =============================================================================

// Create agent instances (singleton pattern)
const cbtAssessmentAgent = new CBTAssessmentAgent();
const cbtPsychotherapistAgent = new CBTPsychotherapistAgent();
const cognitiveRestructuringAgent = new CognitiveRestructuringAgent();

// Agent selection logic
function needsAssessment(userMessage: string, context: any): boolean {
  // Use CBTAssessmentAgent if:
  // 1. No existing goals in the session
  // 2. User explicitly requests new assessment or therapy plan
  // 3. User asks to start working on something new
  
  const hasNoGoals = !context.therapyGoals || context.therapyGoals.length === 0;
  const requestsNewAssessment = userMessage.toLowerCase().includes('assess') && 
                               (userMessage.toLowerCase().includes('me') || 
                                userMessage.toLowerCase().includes('my') ||
                                userMessage.toLowerCase().includes('new plan') ||
                                userMessage.toLowerCase().includes('start over'));
  const requestsTherapyPlan = userMessage.toLowerCase().includes('therapy plan') ||
                             userMessage.toLowerCase().includes('treatment plan') ||
                             userMessage.toLowerCase().includes('create plan');
  
  return hasNoGoals || requestsNewAssessment || requestsTherapyPlan;
}

// Check if user has active ABCDE exercise in progress
function hasActiveABCDEExercise(context: any): boolean {
  return context.inProgressABCDEExercises && context.inProgressABCDEExercises.length > 0;
}

// Check if user wants to abandon/exit the current ABCDE exercise
function wantsToExitABCDE(userMessage: string): boolean {
  const exitIndicators = [
    'stop abcde',
    'exit cognitive restructuring',
    'cancel this exercise',
    'go back to therapy',
    'return to therapist',
    'abandon this',
    'quit this exercise',
    'i want to stop'
  ];
  
  const messageLower = userMessage.toLowerCase();
  return exitIndicators.some(indicator => messageLower.includes(indicator));
}

// Cognitive Restructuring detection logic
function needsCognitiveRestructuring(userMessage: string, context: any): boolean {
  // Use CognitiveRestructuringAgent if:
  // 1. There's an active ABCDE exercise in progress (continue working on it)
  // 2. User mentions ABCDE, cognitive restructuring, or thought challenging
  // 3. User wants to work on specific difficult thoughts or situations
  // 4. User mentions automatic thoughts, negative thinking patterns
  // 5. Psychotherapist agent refers them for cognitive restructuring work
  
  // If there's an active ABCDE exercise, always continue with cognitive restructuring
  if (hasActiveABCDEExercise(context)) {
    return true;
  }
  
  const messageLower = userMessage.toLowerCase();
  const mentionsABCDE = messageLower.includes('abcde') || 
                       messageLower.includes('cognitive restructuring') ||
                       messageLower.includes('thought challenging');
  
  const mentionsThoughts = messageLower.includes('negative thoughts') || 
                          messageLower.includes('automatic thoughts') ||
                          messageLower.includes('thinking patterns') ||
                          messageLower.includes('challenge my thoughts');
  
  const wantsToWorkOn = (messageLower.includes('work on') || messageLower.includes('help with')) &&
                       (messageLower.includes('thoughts') || messageLower.includes('situation') || 
                        messageLower.includes('belief') || messageLower.includes('thinking'));
  
  const referredByCBT = messageLower.includes('cognitive restructuring') ||
                       messageLower.includes('abcde exercise') ||
                       messageLower.includes('thought record');
  
  return mentionsABCDE || mentionsThoughts || wantsToWorkOn || referredByCBT;
}

// Check if cognitive restructuring agent completed its work
function isABCDECompleted(cognitiveResponse: string): boolean {
  // Check if the response indicates completion by looking for completion indicators
  const completionIndicators = [
    'saved your ABCDE exercise',
    'completed ABCDE exercise',
    'exercise is now complete',
    'cognitive restructuring work is done',
    'ABCDE framework completed',
    'excellent work! i\'ve saved your abcde exercise',
    'wonderful work on that cognitive restructuring exercise',
    'this cognitive restructuring work is building your skills'
  ];
  
  // Also check for tool usage indicators (when create_abcde_exercise tool is used)
  const toolUsageIndicators = [
    'create_abcde_exercise',
    'Exercise created successfully',
    'ABCDE exercise record created'
  ];
  
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    cognitiveResponse.toLowerCase().includes(indicator.toLowerCase())
  );
  
  const hasToolUsageIndicator = toolUsageIndicators.some(indicator => 
    cognitiveResponse.toLowerCase().includes(indicator.toLowerCase())
  );
  
  return hasCompletionIndicator || hasToolUsageIndicator;
}

// Response combination logic
function combineTherapyResponses(assessmentResponse: string, therapyResponse: string): string {
  return `[CBT_ASSESSMENT_AGENT_START]
${assessmentResponse}
[CBT_ASSESSMENT_AGENT_END]

[AGENT_SEPARATOR]

[CBT_PSYCHOTHERAPIST_START]
${therapyResponse}
[CBT_PSYCHOTHERAPIST_END]`;
}

function combineCognitiveRestructuringResponse(cognitiveResponse: string, returnResponse: string): string {
  return `[COGNITIVE_RESTRUCTURING_AGENT_START]
${cognitiveResponse}
[COGNITIVE_RESTRUCTURING_AGENT_END]

[AGENT_SEPARATOR]

[CBT_PSYCHOTHERAPIST_START]
${returnResponse}
[CBT_PSYCHOTHERAPIST_END]`;
}

// Main orchestration function
async function processTherapyMessage(
  sessionId: string, 
  userId: string, 
  message: string, 
  threadId: string
): Promise<{ response: string; success: boolean; error?: string }> {
  let context: any = null;
  
  try {
    // Get current session context
    console.log('🧠 Getting therapy session context for orchestration...');
    context = await getTherapySessionContext(sessionId, userId);
    console.log('🧠 Therapy session context retrieved successfully');
    
    if (needsAssessment(message, context)) {
      console.log('🧠 Using CBTAssessmentAgent + CBTPsychotherapistAgent workflow');
      
      // Step 1: CBTAssessmentAgent creates therapeutic structure
      const assessmentStart = Date.now();
      const assessmentResult = await cbtAssessmentAgent.createTherapyPlan(
        sessionId, 
        context.primaryConcern, 
        context.therapyGoal,
        context.therapyStyle,
        context.sessionType, 
        threadId
      );
      console.log(`🧠 Therapy assessment created in ${Date.now() - assessmentStart}ms`);
      
      // Step 2: CBTPsychotherapistAgent begins therapy
      const therapyStart = Date.now();
      const therapyMessage = `I've reviewed your assessment and therapy plan. Let's begin by exploring your primary concern and working together on your first therapeutic goal.`;
      
      // Refresh context to include newly created goals and exercises
      const updatedContext = await getTherapySessionContext(sessionId, userId);
      const therapyResult = await cbtPsychotherapistAgent.provideCare(
        sessionId,
        therapyMessage,
        updatedContext,
        threadId
      );
      console.log(`🧠 Therapy response created in ${Date.now() - therapyStart}ms`);
      
      // Combine responses
      const combinedResponse = combineTherapyResponses(assessmentResult, therapyResult);
      
      // Save the conversation
      await saveTherapyConversation(sessionId, message, combinedResponse);
      
      return {
        response: combinedResponse,
        success: true
      };
      
    } else if (needsCognitiveRestructuring(message, context)) {
      // Check if user wants to exit an active ABCDE exercise
      if (hasActiveABCDEExercise(context) && wantsToExitABCDE(message)) {
        console.log('🧠 User wants to exit ABCDE exercise - returning to psychotherapist');
        
        // Mark any in-progress ABCDE exercises as abandoned
        try {
          await prisma.aBCDEExercise.updateMany({
            where: {
              sessionId,
              userId,
              completionStatus: 'in_progress'
            },
            data: {
              completionStatus: 'abandoned',
              updatedAt: new Date()
            }
          });
        } catch (error) {
          console.error('Error updating abandoned ABCDE exercises:', error);
        }
        
        // Return to psychotherapist agent
        const therapyStart = Date.now();
        const therapyMessage = `The user has decided to stop their cognitive restructuring exercise and return to therapy. Please acknowledge their choice and continue with supportive therapy.`;
        
        const therapyResult = await cbtPsychotherapistAgent.provideCare(
          sessionId,
          therapyMessage,
          context,
          threadId
        );
        console.log(`🧠 Therapy response created in ${Date.now() - therapyStart}ms`);
        
        // Save the conversation
        await saveTherapyConversation(sessionId, message, therapyResult);
        
        return {
          response: therapyResult,
          success: true
        };
      }
      
      console.log('🧠 Using CognitiveRestructuringAgent workflow');
      
      // Use ONLY the CognitiveRestructuringAgent - no immediate psychotherapist follow-up
      const cognitiveStart = Date.now();
      const cognitiveResult = await cognitiveRestructuringAgent.facilitateABCDE(
        sessionId,
        message,
        context,
        threadId
      );
      console.log(`🧠 Cognitive restructuring response created in ${Date.now() - cognitiveStart}ms`);
      
      // Check if the cognitive restructuring work is complete
      if (isABCDECompleted(cognitiveResult)) {
        console.log('🧠 ABCDE exercise completed - adding psychotherapist follow-up');
        
        // Only now provide psychotherapist follow-up since ABCDE is complete
        const followUpStart = Date.now();
        const followUpMessage = `The user has just completed a cognitive restructuring exercise. Please provide supportive follow-up, integrate this work with their overall therapy goals, and continue the therapeutic conversation.`;
        
        // Refresh context to include newly completed ABCDE exercise
        const updatedContext = await getTherapySessionContext(sessionId, userId);
        const followUpResult = await cbtPsychotherapistAgent.provideCare(
          sessionId,
          followUpMessage,
          updatedContext,
          threadId
        );
        console.log(`🧠 Therapy follow-up completed in ${Date.now() - followUpStart}ms`);
        
        // Combine responses
        const combinedResponse = combineCognitiveRestructuringResponse(cognitiveResult, followUpResult);
        
        // Save the conversation
        await saveTherapyConversation(sessionId, message, combinedResponse);
        
        return {
          response: combinedResponse,
          success: true
        };
      } else {
        console.log('🧠 ABCDE exercise in progress - continuing with cognitive restructuring only');
        
        // ABCDE exercise is still in progress - return only cognitive restructuring response
        // Save the conversation
        await saveTherapyConversation(sessionId, message, cognitiveResult);
        
        return {
          response: cognitiveResult,
          success: true
        };
      }
      
    } else {
      console.log('🧠 Using CBTPsychotherapistAgent only');
      
      // Direct to CBTPsychotherapistAgent for ongoing therapy
      const therapyStart = Date.now();
      const therapyResult = await cbtPsychotherapistAgent.provideCare(
        sessionId,
        message,
        context,
        threadId
      );
      console.log(`🧠 Therapy response created in ${Date.now() - therapyStart}ms`);
      
      // Save the conversation
      await saveTherapyConversation(sessionId, message, therapyResult);
      
      return {
        response: therapyResult,
        success: true
      };
    }
    
  } catch (error) {
    console.error('🧠 Error in CBT agent orchestration:', error);
    
    // Fallback response
    if (context) {
      console.log('🧠 Using fallback response with context');
      try {
        const fallbackResponse = await createSimpleResponse(message, context);
        await saveTherapyConversation(sessionId, message, fallbackResponse);
        return {
          response: fallbackResponse,
          success: true
        };
      } catch (fallbackError) {
        console.error('🧠 Fallback response also failed:', fallbackError);
      }
    }
    
    // Last resort error response
    return {
      response: 'I apologize, but I encountered an error. Please try refreshing the page and starting a new therapy session. If you\'re in crisis, please reach out to emergency services or a mental health professional immediately.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Function to get therapy session context for the agents
async function getTherapySessionContext(sessionId: string, userId: string) {
  try {
    console.log('Getting therapy session context for:', { sessionId, userId });
    
    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, userId },
      include: {
        user: { select: { email: true } },
        goals: {
          orderBy: { priority: 'asc' },
          include: { subGoals: true }
        },
        exercises: {
          orderBy: { createdAt: 'desc' }
        },
        abcdeExercises: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      console.error('Therapy session not found in database:', { sessionId, userId });
      throw new Error(`Therapy session not found for user ${userId}`);
    }

    console.log('Found therapy session:', {
      id: session.id,
      primaryConcern: session.primaryConcern,
      userEmail: session.user.email,
      goalsCount: session.goals.length,
      exercisesCount: session.exercises.length,
      abcdeExercisesCount: session.abcdeExercises.length
    });

    const completedExercises = session.exercises.filter(exercise => exercise.isCompleted);
    const pendingExercises = session.exercises.filter(exercise => !exercise.isCompleted);
    const completedABCDEExercises = session.abcdeExercises.filter(exercise => exercise.completionStatus === 'completed');
    const inProgressABCDEExercises = session.abcdeExercises.filter(exercise => exercise.completionStatus === 'in_progress');

    const context = {
      userEmail: session.user.email,
      primaryConcern: session.primaryConcern,
      therapyGoal: session.therapyGoal,
      therapyStyle: session.therapyStyle,
      sessionType: session.sessionType,
      therapyGoals: session.goals,
      completedExercises,
      pendingExercises,
      completedABCDEExercises,
      inProgressABCDEExercises,
      progressLevel: session.progressLevel
    };

    console.log('Returning therapy session context:', {
      userEmail: context.userEmail,
      primaryConcern: context.primaryConcern,
      therapyStyle: context.therapyStyle,
      goalsCount: context.therapyGoals.length,
      completedExercisesCount: context.completedExercises.length,
      pendingExercisesCount: context.pendingExercises.length,
      completedABCDEExercisesCount: context.completedABCDEExercises.length,
      inProgressABCDEExercisesCount: context.inProgressABCDEExercises.length,
      progressLevel: context.progressLevel
    });

    return context;
  } catch (error) {
    console.error('Error getting therapy session context:', error);
    throw error; // Don't use fallback here, let the caller handle it
  }
}

// Save therapy conversation (both user and assistant messages)
async function saveTherapyConversation(sessionId: string, userMessage: string, assistantMessage: string): Promise<void> {
  try {
    await prisma.therapyChatMessage.createMany({
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
    console.log('💾 Therapy conversation saved to database');
  } catch (error) {
    console.error('💾 Error saving therapy conversation:', error);
  }
}

// =============================================================================
// MAIN CHAT FUNCTION - CBT DUAL-AGENT SYSTEM
// =============================================================================

// Main chat function that uses the CBT dual-agent orchestration
export async function chatWithCBTAgent(
  sessionId: string,
  userId: string,
  message: string,
  threadId: string
) {
  console.log('🧠 Starting CBT dual-agent therapy system...');
  const totalStart = Date.now();
  
  try {
    const result = await processTherapyMessage(sessionId, userId, message, threadId);
    
    const totalElapsed = Date.now() - totalStart;
    console.log(`🧠 Total CBT dual-agent response time: ${totalElapsed}ms`);
    
    return result;
    
  } catch (error) {
    console.error('🧠 Critical error in CBT dual-agent system:', error);
    
    // Ultimate fallback
    return {
      response: 'I apologize, but I encountered a technical issue. Please try refreshing the page and starting a new therapy session. If you\'re in crisis, please contact emergency services or a mental health professional immediately.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 