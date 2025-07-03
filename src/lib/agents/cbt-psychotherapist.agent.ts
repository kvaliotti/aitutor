import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createGeminiModel, memory, createSimpleResponse } from './shared';

// Tools for CBTPsychotherapistAgent  
const goalProgressTool = tool(
  async ({ goalId, isCompleted }) => {
    console.log('🧠 CBTPsychotherapistAgent - goalProgressTool called:', { goalId, isCompleted });
    
    try {
      // First, find the goal and automatically get its session info
      const goal = await prisma.therapyGoal.findUnique({
        where: { id: goalId },
        include: {
          session: {
            select: { 
              id: true, 
              userId: true, 
              primaryConcern: true 
            }
          }
        }
      });
      
      if (!goal) {
        console.warn(`🧠 Therapy goal not found: ${goalId}`);
        return `I couldn't find that specific goal. Your progress tracking is still working correctly through the sidebar.`;
      }

      if (!goal.session) {
        console.warn(`🧠 Therapy goal ${goalId} has no associated session`);
        return `There was a technical issue with the progress tracker. You can manually update your progress in the sidebar.`;
      }

      const sessionId = goal.session.id;
      console.log(`🧠 Auto-detected sessionId: ${sessionId} for goal: ${goal.title}`);

      // Update the goal
      await prisma.therapyGoal.update({
        where: { id: goalId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });

      // Create progress history record
      await prisma.therapyProgressHistory.create({
        data: {
          userId: goal.session.userId,
          sessionId: sessionId,
          goalId: goalId,
          progressType: isCompleted ? 'goal_completed' : 'goal_updated',
          progressValue: isCompleted ? 100 : 0,
          notes: `Goal "${goal.title}" ${isCompleted ? 'completed' : 'updated'} during therapy session`
        }
      });

      // Automatically update session progress level
      const allGoals = await prisma.therapyGoal.findMany({
        where: { sessionId },
        select: { isCompleted: true }
      });

      const completedCount = allGoals.filter(g => g.isCompleted).length;
      const progressLevel = allGoals.length > 0 ? (completedCount / allGoals.length) * 100 : 0;

      await prisma.therapySession.update({
        where: { id: sessionId },
        data: { 
          progressLevel,
          status: progressLevel === 100 ? 'completed' : 'active',
          updatedAt: new Date()
        }
      });
      
      const statusText = isCompleted ? 'completed' : 'in progress';
      const progressText = progressLevel > 0 ? ` (${Math.round(progressLevel)}% overall progress)` : '';
      
      console.log(`🧠 Successfully updated goal ${goalId} to ${statusText}, session progress: ${progressLevel}%`);
      return `Excellent progress! I've marked "${goal.title}" as ${statusText}${progressText}. You're doing great work! 🌟`;
      
    } catch (error) {
      console.error('🧠 Error updating goal progress:', error);
      
      // Return a graceful message that doesn't break the therapeutic conversation
      return `You're making wonderful progress! While I had a small technical hiccup updating the progress tracker, you can manually mark your progress in the sidebar. Keep up the great therapeutic work!`;
    }
  },
  {
    name: "update_goal_progress",
    description: "Update the completion status of a therapeutic goal when client demonstrates progress or achievement. The tool automatically handles session management and progress calculations.",
    schema: z.object({
      goalId: z.string().describe("The exact UUID of the therapeutic goal to update (must exist in database)"),
      isCompleted: z.boolean().describe("Whether the goal is completed based on client's demonstrated progress")
    })
  }
);

const exerciseProgressTool = tool(
  async ({ exerciseId, isCompleted, feedback }) => {
    console.log('🧠 CBTPsychotherapistAgent - exerciseProgressTool called:', { exerciseId, isCompleted });
    
    try {
      // Find the exercise and automatically get its session info
      const exercise = await prisma.therapyExercise.findUnique({
        where: { id: exerciseId },
        include: {
          session: {
            select: { 
              id: true, 
              userId: true, 
              primaryConcern: true 
            }
          }
        }
      });
      
      if (!exercise) {
        console.warn(`🧠 Therapy exercise not found: ${exerciseId}`);
        return `I couldn't find that specific exercise. Your progress tracking is still working correctly through the sidebar.`;
      }

      if (!exercise.session) {
        console.warn(`🧠 Therapy exercise ${exerciseId} has no associated session`);
        return `There was a technical issue with the progress tracker. You can manually update your progress in the sidebar.`;
      }

      const sessionId = exercise.session.id;
      console.log(`🧠 Auto-detected sessionId: ${sessionId} for exercise: ${exercise.title}`);

      // Update the exercise
      await prisma.therapyExercise.update({
        where: { id: exerciseId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          feedback: feedback || null
        }
      });

      // Create progress history record
      await prisma.therapyProgressHistory.create({
        data: {
          userId: exercise.session.userId,
          sessionId: sessionId,
          progressType: 'exercise_completed',
          progressValue: isCompleted ? 100 : 0,
          notes: `Exercise "${exercise.title}" completed with feedback: ${feedback || 'No feedback provided'}`
        }
      });

      const statusText = isCompleted ? 'completed' : 'in progress';
      const feedbackText = feedback ? ` Your feedback: "${feedback}"` : '';
      
      console.log(`🧠 Successfully updated exercise ${exerciseId} to ${statusText}`);
      return `Great work completing the "${exercise.title}" exercise!${feedbackText} This practice is helping you build important coping skills. 💪`;
      
    } catch (error) {
      console.error('🧠 Error updating exercise progress:', error);
      
      // Return a graceful message that doesn't break the therapeutic conversation
      return `Excellent work on that exercise! While I had a small technical hiccup updating the progress tracker, you can manually mark your progress in the sidebar. Keep practicing!`;
    }
  },
  {
    name: "update_exercise_progress",
    description: "Update the completion status of a therapeutic exercise when client completes it. The tool automatically handles session management and can record client feedback.",
    schema: z.object({
      exerciseId: z.string().describe("The exact UUID of the therapeutic exercise to update (must exist in database)"),
      isCompleted: z.boolean().describe("Whether the exercise is completed based on client's work"),
      feedback: z.string().optional().describe("Optional feedback from the client about the exercise")
    })
  }
);

export class CBTPsychotherapistAgent {
  private agent: any;
  
  constructor() {
    const model = createGeminiModel(0.7); // Higher temperature for empathetic therapeutic responses
    if (!model) {
      this.agent = null;
      return;
    }
    
    try {
      this.agent = createReactAgent({
        llm: model,
        tools: [goalProgressTool, exerciseProgressTool],
        checkpointSaver: memory,
      });
      console.log('🧠 CBTPsychotherapistAgent created successfully');
    } catch (error) {
      console.error('Error creating CBTPsychotherapistAgent:', error);
      this.agent = null;
    }
  }
  
  private generateTherapyPrompt(context: any): string {
    const goalContext = context.currentGoal ? `
- Therapeutic Goal: ${context.currentGoal}
- Purpose: Guide the client toward achieving this specific therapeutic goal through ${context.primaryConcern}` : '';

    return `You are an Expert CBT Psychotherapist specializing in ${context.primaryConcern || 'mental health and well-being'}.

CONTEXT:
- Primary Concern: ${context.primaryConcern}${goalContext}
- Therapy Style: ${context.therapyStyle}
- Session Type: ${context.sessionType || 'therapy'}
- Session Progress: ${context.progressLevel || 0}% complete

🚫 CRITICAL SCOPE LIMITATIONS:
REMEMBER: You are an AI providing educational CBT guidance, NOT a licensed therapist. You must:

1. **Always remind users** this is educational CBT guidance, not professional therapy
2. **Crisis situations**: If someone mentions self-harm, suicidal thoughts, or crisis situations, immediately direct them to:
   - Emergency: Call 911 or go to emergency room
   - Crisis Text Line: Text HOME to 741741
   - National Suicide Prevention Lifeline: 988
   - Or contact a mental health professional immediately

3. **Scope boundaries**: Stay within educational CBT techniques and guidance
4. **Professional referral**: Encourage seeking professional help for ongoing mental health support

RESPONSE for crisis situations:
"I'm concerned about what you've shared. Please reach out for immediate help:
- Emergency: Call 911 or go to your nearest emergency room
- Crisis Text Line: Text HOME to 741741
- National Suicide Prevention Lifeline: 988

This is educational CBT guidance, but you need professional support right now. Please reach out immediately."

🚫 OFF-TOPIC QUERY PROTECTION:
If the user asks for something NOT related to CBT therapy or mental health support for "${context.primaryConcern}", politely decline:

DECLINE these requests:
- Text summarizing, rewriting, or editing tasks
- General writing or content creation  
- Code debugging or technical help
- Academic homework or assignments
- Any task outside CBT therapeutic guidance

RESPONSE for off-topic requests:
"I'm your CBT therapeutic guide focused specifically on helping you with ${context.primaryConcern}. I can't help with [summarizing texts/writing content/debugging code/etc.] as that's outside my therapeutic role.

However, I'd be happy to:
- Guide you through CBT techniques for ${context.primaryConcern}
- Help you practice therapeutic exercises
- Support you in working toward your therapeutic goals
- Provide educational CBT strategies and insights

What aspect of your ${context.primaryConcern} would you like to work on today?"

ALWAYS stay focused on providing CBT therapeutic guidance for "${context.primaryConcern}".

CURRENT THERAPEUTIC STATE:
- Total Goals: ${context.therapyGoals?.length || 0}
- Completed Exercises: ${context.completedExercises?.length || 0} 
- Pending Exercises: ${context.pendingExercises?.length || 0}

${context.therapyGoals?.length > 0 ? `
THERAPEUTIC GOALS PROGRESS:
${context.therapyGoals.map((goal: any, index: number) => 
  `${index + 1}. ${goal.title} - ${goal.isCompleted ? '✅ Achieved' : '🎯 In Progress'} (Priority: ${goal.priority === 1 ? 'High' : goal.priority === 2 ? 'Medium' : 'Low'})`
).join('\n')}
` : ''}

${context.completedExercises?.length > 0 ? `
COMPLETED EXERCISES:
${context.completedExercises.map((exercise: any) => `- ✅ ${exercise.title} (${exercise.exerciseType})`).join('\n')}
` : ''}

${context.pendingExercises?.length > 0 ? `
PENDING EXERCISES:
${context.pendingExercises.map((exercise: any) => `- 🎯 ${exercise.title} (${exercise.exerciseType}) - ${exercise.estimatedTime} min`).join('\n')}
` : ''}

PROGRESS UPDATE GUIDELINES:
- Use update_goal_progress tool ONLY when client demonstrates clear progress toward or achievement of a therapeutic goal through:
  * Successfully implementing coping strategies
  * Showing significant insight or behavioral change
  * Completing goal-related work with positive outcomes
  * Demonstrating mastery of therapeutic techniques
- Use update_exercise_progress tool when client completes or demonstrates completion of a therapeutic exercise
- NEVER update progress automatically - wait for clear evidence of therapeutic progress
- The tools automatically handle all technical details (session management, progress calculations)

AVAILABLE GOALS FOR PROGRESS UPDATES:
${context.therapyGoals?.length > 0 ? 
  context.therapyGoals.map((goal: any) => 
    `- ID: ${goal.id} | Title: "${goal.title}" | Status: ${goal.isCompleted ? '✅ Achieved' : '🎯 In Progress'} | Priority: ${goal.priority === 1 ? 'High' : goal.priority === 2 ? 'Medium' : 'Low'}`
  ).join('\n') : 
  '- No therapeutic goals available for updates'
}

AVAILABLE EXERCISES FOR PROGRESS UPDATES:
${context.completedExercises?.length > 0 || context.pendingExercises?.length > 0 ? 
  [
    ...(context.completedExercises || []).map((exercise: any) => `- ID: ${exercise.id} | Title: "${exercise.title}" | Status: ✅ Completed`),
    ...(context.pendingExercises || []).map((exercise: any) => `- ID: ${exercise.id} | Title: "${exercise.title}" | Status: 🎯 Pending`)
  ].join('\n') : 
  '- No therapeutic exercises available for updates'
}

TOOL USAGE SAFETY RULES:
- ONLY use update_goal_progress when client clearly demonstrates therapeutic progress or goal achievement
- ONLY use update_exercise_progress when client completes or shows completion of an exercise
- ALWAYS use exact IDs from the "AVAILABLE GOALS" and "AVAILABLE EXERCISES" lists above
- Example goal update: update_goal_progress({ goalId: "uuid-from-list-above", isCompleted: true })
- Example exercise update: update_exercise_progress({ exerciseId: "uuid-from-list-above", isCompleted: true, feedback: "client's feedback" })
- If unsure about IDs, do NOT use the tools - let client update manually
- Tool failures are handled gracefully - focus on therapy, not progress tracking

For tables, please use the basic GFM table syntax and do NOT include any extra whitespace or tabs for alignment.

RESPONSE FORMATTING REQUIREMENTS:
Use rich markdown formatting for therapeutic content:

## 🧠 [Therapeutic Focus/Topic]

### 💙 Understanding & Validation
**Your Experience**: Acknowledge and validate the client's experience

### 🔍 CBT Insight
[Educational insight about the CBT principle or technique being discussed]

### 💡 Key Therapeutic Points
- **Point 1**: Specific CBT insight with therapeutic rationale
- **Point 2**: Specific CBT insight with therapeutic rationale
- **Point 3**: Specific CBT insight with therapeutic rationale

### 🌟 Practical Application
| Situation | CBT Technique | Expected Benefit |
| Example situation | Specific technique | Therapeutic benefit |
| Example situation | Specific technique | Therapeutic benefit |

### 🎯 Your Next Step
**Gentle Challenge**: [ONE clear, specific therapeutic action that combines practice and reflection]

For example:
- Try practicing [specific CBT technique] and then reflect on [specific therapeutic question]
- Apply this insight to [specific situation] and notice [specific change]
- Practice [specific skill] while being mindful of [specific aspect]

CRITICAL: Always end with exactly ONE clear therapeutic action that guides the client's next step.

COMMUNICATION STRUCTURE (Therapeutic Approach):
1. **Validate & understand**: Start with empathy and validation
2. **Educate with insight**: Provide CBT understanding and techniques
3. **Make it practical**: Use concrete, relatable therapeutic applications
4. **Connect to progress**: Show how it fits in their therapeutic journey
5. **End with gentle action**: ONE clear next step that combines practice and mindful reflection

THERAPY STYLE FOR ${context.therapyStyle}:
${context.therapyStyle === 'cognitive-behavioral' ? 
  '- Focus on thought-feeling-behavior connections\n- Use cognitive restructuring and behavioral activation\n- Practice evidence-based CBT techniques' :
  context.therapyStyle === 'mindfulness-based' ?
  '- Incorporate mindfulness and present-moment awareness\n- Use acceptance and non-judgmental observation\n- Guide mindful exploration of thoughts and feelings' :
  '- Focus on practical solutions and goal achievement\n- Emphasize strengths and resources\n- Guide toward specific, actionable steps'
}

PROGRESS-AWARE RESPONSES:
- Reference client's previous therapeutic work when relevant
- Build on completed goals to guide toward new ones
- Acknowledge completed exercises and connect them to current growth
- Suggest appropriate next exercises based on current progress
- Celebrate therapeutic achievements and insights

FORMATTING GUIDELINES:
- Use **bold** for key therapeutic concepts and emphasis
- Use \`CBT techniques\` for specific therapeutic methods
- Use > blockquotes for important therapeutic insights
- Use tables for CBT applications, thought records, or structured exercises
- Use emojis for emotional warmth and therapeutic connection
- Use bullet points and numbered lists for clarity

THERAPEUTIC REQUIREMENTS:
- Maintain warm, empathetic, non-judgmental tone
- Include specific, practical CBT techniques
- Connect to client's therapeutic goals
- Encourage self-compassion and hope
- End with ONE clear therapeutic action
- Reference client's progress when relevant
- Always include disclaimer about educational nature

CONTENT REQUIREMENTS:
- Include specific CBT techniques and applications
- Connect to practical life situations
- Encourage therapeutic practice and reflection
- Maintain professional therapeutic boundaries
- End with ONE clear call-to-action
- Reference client's therapeutic progress when relevant
- Focus on driving user to take action, provide answer or otherwise progress right away.

Remember: You're providing educational CBT guidance to support someone's mental health journey. Therapy comes first, progress tracking is secondary. Always maintain appropriate boundaries and encourage professional support.`;
  }
  
  async provideCare(sessionId: string, userMessage: string, context: any, threadId: string): Promise<string> {
    console.log('🧠 CBTPsychotherapistAgent invoked. Style:', context.therapyStyle);

    if (!this.agent) {
      console.log('🧠 CBTPsychotherapistAgent not available, using fallback');
      const fallback = await createSimpleResponse(userMessage, context);
      return `🧠 **CBT Psychotherapist**\n\n${fallback}`;
    }
    
    try {
      const startTime = Date.now();
      console.log('🧠 CBTPsychotherapistAgent - Providing care for:', context.primaryConcern);
      
      const config = { 
        configurable: { 
          thread_id: `${threadId}_therapy`,
          checkpoint_ns: "therapy_session"
        } 
      };

      // Let LangGraph manage history. We only send the new messages.
      const messages: BaseMessage[] = [];

      // The CBTPsychotherapistAgent provides the full context in each interaction
      console.log('🧠 Generating therapy prompt and sending to agent.');
      const prompt = this.generateTherapyPrompt(context);
      messages.push(new HumanMessage({
        content: `${prompt}\n\n---START OF THERAPY SESSION---\n\nClient message: ${userMessage}`
      }));
      
      const response = await this.agent.invoke(
        { messages }, 
        { ...config, recursionLimit: 25 }
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`🧠 CBTPsychotherapistAgent completed in ${elapsed}ms`);
      
      const assistantMessage = response.messages[response.messages.length - 1];
      let content = '';
      
      // Enhanced content extraction with validation
      if (typeof assistantMessage.content === 'string') {
        content = assistantMessage.content.trim();
      } else if (Array.isArray(assistantMessage.content)) {
        // Handle array of content objects (common with some LLM responses)
        content = assistantMessage.content
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.text || item.content || item.message || '';
            }
            return '';
          })
          .join(' ')
          .trim();
      } else if (assistantMessage.content && typeof assistantMessage.content === 'object') {
        // Handle object content
        content = assistantMessage.content.text || 
                 assistantMessage.content.content || 
                 assistantMessage.content.message ||
                 '';
      }
      
      // Validate and clean content
      if (!content || content.trim() === '') {
        console.warn('🧠 CBTPsychotherapistAgent returned empty content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Check for content corruption indicators
      if (content.includes('<details>') || 
          content.includes('Safety measures') || 
          content.includes('</details>')) {
        console.warn('🧠 CBTPsychotherapistAgent returned corrupted/unsafe content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Final validation
      if (!content || content.trim().length < 10) {
        console.warn('🧠 CBTPsychotherapistAgent content too short, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
        
      // Add agent identification to the response
      return `🧠 **CBT Psychotherapist**\n\n${content}`;
        
    } catch (error) {
      console.error('🧠 CBTPsychotherapistAgent error:', error);
      
      // Enhanced fallback with better error context
      const fallback = await createSimpleResponse(userMessage, context);
      console.log('🧠 Using enhanced fallback response due to agent error');
      
      return `🧠 **CBT Psychotherapist**\n\n${fallback}`;
    }
  }
} 