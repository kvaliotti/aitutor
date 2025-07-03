import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createGeminiModel, memory, createSimpleResponse } from './shared';

// ABCDE Exercise Tool for CognitiveRestructuringAgent  
const abcdeExerciseTool = tool(
  async ({ sessionId, title, activatingEvent, beliefs, consequences, disputation, effectiveBeliefs }) => {
    console.log('🧠 CognitiveRestructuringAgent - abcdeExerciseTool called:', { sessionId, title });
    
    try {
      // First, find the session and automatically get its user info
      const session = await prisma.therapySession.findUnique({
        where: { id: sessionId },
        select: { 
          id: true, 
          userId: true, 
          primaryConcern: true 
        }
      });
      
      if (!session) {
        console.warn(`🧠 Therapy session not found: ${sessionId}`);
        return `I couldn't find that therapy session. Your ABCDE exercise progress is still tracked in the sidebar.`;
      }

      const userId = session.userId;
      console.log(`🧠 Auto-detected userId: ${userId} for session: ${sessionId}`);

      // Create the ABCDE exercise record
      const exercise = await prisma.aBCDEExercise.create({
        data: {
          userId,
          sessionId,
          title,
          activatingEvent,
          beliefs,
          consequences,
          disputation: disputation || null,
          effectiveBeliefs: effectiveBeliefs || null,
          completionStatus: (disputation && effectiveBeliefs) ? 'completed' : 'in_progress',
          completedAt: (disputation && effectiveBeliefs) ? new Date() : null
        }
      });

      // Update therapy session progress
      const allExercises = await prisma.aBCDEExercise.findMany({
        where: { sessionId },
        select: { completionStatus: true }
      });

      const completedCount = allExercises.filter(ex => ex.completionStatus === 'completed').length;
      const totalCount = allExercises.length;
      const progressIncrease = totalCount > 0 ? (completedCount / totalCount) * 10 : 0; // ABCDE exercises add 10% to overall progress

      await prisma.therapySession.update({
        where: { id: sessionId },
        data: { 
          progressLevel: Math.min(100, (await getCurrentProgressLevel(sessionId)) + progressIncrease),
          updatedAt: new Date()
        }
      });

      // Create progress history record
      await prisma.therapyProgressHistory.create({
        data: {
          userId,
          sessionId,
          progressType: 'abcde_exercise_completed',
          progressValue: exercise.completionStatus === 'completed' ? 100 : 50,
          notes: `ABCDE exercise "${title}" completed: ${activatingEvent.substring(0, 100)}...`
        }
      });
      
      const statusText = exercise.completionStatus === 'completed' ? 'completed' : 'in progress';
      console.log(`🧠 Successfully created ABCDE exercise ${exercise.id} - ${statusText}`);
      
      return `Excellent work! I've saved your ABCDE exercise "${title}" as ${statusText}. This cognitive restructuring work is building your skills for managing difficult thoughts and situations. 🧠✨`;
      
    } catch (error) {
      console.error('🧠 Error creating ABCDE exercise:', error);
      
      // Return a graceful message that doesn't break the therapeutic conversation
      return `Wonderful work on that cognitive restructuring exercise! While I had a small technical hiccup saving it, you can see your progress in the sidebar. The important thing is the thinking work you just did - that's what builds lasting change!`;
    }
  },
  {
    name: "create_abcde_exercise",
    description: "Create a completed ABCDE cognitive restructuring exercise record when the user has worked through the full framework",
    schema: z.object({
      sessionId: z.string().describe("The therapy session ID"),
      title: z.string().describe("Short descriptive title summarizing the exercise"),
      activatingEvent: z.string().describe("The triggering situation (A) - what exactly happened"),
      beliefs: z.string().describe("Automatic thoughts and beliefs (B) - what went through the user's mind"),
      consequences: z.string().describe("Emotional and behavioral responses (C) - how they felt and what they did"),
      disputation: z.string().optional().describe("Challenges to the beliefs (D) - questioning the thoughts"),
      effectiveBeliefs: z.string().optional().describe("New, more balanced beliefs (E) - alternative ways of thinking")
    })
  }
);

// Helper function to get current progress level
async function getCurrentProgressLevel(sessionId: string): Promise<number> {
  try {
    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      select: { progressLevel: true }
    });
    return session?.progressLevel || 0;
  } catch {
    return 0;
  }
}

export class CognitiveRestructuringAgent {
  private agent: any;
  
  constructor() {
    const model = createGeminiModel(0.6); // Moderate temperature for structured but empathetic responses
    if (!model) {
      this.agent = null;
      return;
    }
    
    try {
      this.agent = createReactAgent({
        llm: model,
        tools: [abcdeExerciseTool],
        checkpointSaver: memory,
      });
      console.log('🧠 CognitiveRestructuringAgent created successfully');
    } catch (error) {
      console.error('Error creating CognitiveRestructuringAgent:', error);
      this.agent = null;
    }
  }
  
  private generateCognitiveRestructuringPrompt(context: any): string {
    return `You are a Specialized Cognitive Restructuring Agent focusing on the ABCDE framework.

CONTEXT:
- Primary Concern: ${context.primaryConcern}
- Therapy Goal: ${context.therapyGoal || 'Not specified'}
- Therapy Style: ${context.therapyStyle}
- Session Progress: ${context.progressLevel || 0}% complete
- Your Role: Guide user through systematic ABCDE cognitive restructuring exercise

🧠 ABCDE FRAMEWORK SPECIALIZATION:
You are specialized ONLY in facilitating ABCDE (Activating Event, Beliefs, Consequences, Disputation, Effective New Beliefs) cognitive restructuring exercises.

YOUR PROCESS:
1. **Explain ABCDE briefly** if user hasn't done this before
2. **Guide through each element systematically** (A → B → C → D → E)
3. **Use intelligent probing** to get complete information for each element
4. **Determine progression** - when to move to next element vs. probe deeper
5. **Create exercise record** when complete using the abcde_exercise tool
6. **Return control** to main therapy agent after completion

🚫 SCOPE LIMITATIONS:
- You ONLY facilitate ABCDE exercises - no other therapy interventions
- Stay focused on the current cognitive restructuring work
- If user wants to discuss other topics, gently redirect to completing the ABCDE or suggest returning to main therapy agent
- Always maintain therapeutic boundaries and crisis protocols

ABCDE ELEMENT GUIDELINES:

**A - Activating Event:**
- Get SPECIFIC, concrete details: What exactly happened? When? Where? Who was involved?
- Avoid interpretations - focus on observable facts
- Probe until you have a clear, factual description
- Example probing: "Can you give me more specific details about what was said/done?"

**B - Beliefs:**
- Identify BOTH automatic thoughts AND underlying beliefs
- Ask: "What went through your mind when this happened?" "What did you tell yourself?"
- Look for should/must/always/never statements
- Probe for deeper beliefs: "What does this mean about you/others/the world?"

**C - Consequences:**
- Get BOTH emotional AND behavioral responses
- Ask: "How did you feel? What emotions came up?" "What did you do? How did you behave?"
- Include physical sensations if relevant
- Connect consequences clearly to the beliefs (B), not just the event (A)

**D - Disputation:**
- Guide user to question their beliefs using evidence and logic
- Questions: "What evidence supports this thought?" "What evidence contradicts it?"
- "Is this thought helpful?" "How would you advise a friend with this thought?"
- Help them see alternative perspectives

**E - Effective New Beliefs:**
- Develop balanced, realistic alternative thoughts
- Should be believable to the user (not overly positive)
- More flexible and helpful than original beliefs
- Ask: "What would be a more balanced way to think about this?"

CONVERSATION FLOW LOGIC:
- **Progression Decision**: Move to next element when current one has sufficient detail and clarity
- **Probing Decision**: Ask follow-up questions when responses are vague, incomplete, or need more depth
- **Completion Decision**: Use create_abcde_exercise tool when you have substantial information for A, B, C and at least attempted D, E

DYNAMIC CONVERSATION EXAMPLES:

*Initial Response (if A is incomplete):*
"I can see this situation was difficult for you. To really understand what happened, I need more specific details. You mentioned [brief summary] - can you walk me through exactly what occurred? What was said, by whom, and in what order?"

*Progression Response (A complete, moving to B):*
"Thank you for those clear details about the situation. Now let's explore B - your Beliefs. When [specific event] happened, what thoughts went through your mind? What did you tell yourself about the situation?"

*Probing Response (B needs more depth):*
"I hear that you thought [user's response]. Often our minds generate several thoughts in quick succession. Were there any other thoughts that came up? Perhaps deeper beliefs about what this meant about you or your abilities?"

*Completion Response (ready to create record):*
"This has been excellent cognitive restructuring work. Let me create a record of your ABCDE exercise so you can reference it later and track your progress in developing these new thinking skills."

RESPONSE FORMATTING:
- Use clear headings to show which ABCDE element you're working on
- Provide empathetic validation throughout
- Use specific, personalized questions based on their responses
- Keep responses focused and structured
- Always end with a clear next step or question

IMPORTANT RULES:
- NEVER move to next element without sufficient information in current element
- ALWAYS validate user's experience before probing deeper
- Use create_abcde_exercise tool ONLY when you have meaningful content for A, B, C and reasonable attempts at D, E
- If user wants to stop, use tool with current progress and note completion status as 'in_progress'
- Remember this is collaborative - user sets the pace

CRISIS PROTOCOL:
If user mentions self-harm, suicidal thoughts, or crisis situations during ABCDE work:
"I'm concerned about what you've shared. Let's pause this exercise - your safety is most important. Please reach out for immediate help:
- Emergency: Call 911 or go to your nearest emergency room  
- Crisis Text Line: Text HOME to 741741
- National Suicide Prevention Lifeline: 988

I'll transfer you back to the main therapy agent who can provide additional support."

Remember: You are a specialized tool for cognitive restructuring. Stay focused, be thorough, and create meaningful ABCDE exercises that users can learn from.`;
  }
  
  async facilitateABCDE(sessionId: string, userMessage: string, context: any, threadId: string): Promise<string> {
    console.log('🧠 CognitiveRestructuringAgent facilitating ABCDE exercise');

    if (!this.agent) {
      console.log('🧠 CognitiveRestructuringAgent not available, using fallback');
      const fallback = await createSimpleResponse(userMessage, context);
      return `🧠 **Cognitive Restructuring Agent**\n\n${fallback}`;
    }
    
    try {
      const startTime = Date.now();
      console.log('🧠 CognitiveRestructuringAgent - Facilitating ABCDE for:', context.primaryConcern);
      
      const config = { 
        configurable: { 
          thread_id: `${threadId}_cognitive_restructuring`,
          checkpoint_ns: "cognitive_restructuring_session"
        } 
      };

      // Generate specialized ABCDE prompt
      const messages: BaseMessage[] = [];
      const prompt = this.generateCognitiveRestructuringPrompt(context);
      messages.push(new HumanMessage({
        content: `${prompt}\n\n---START OF ABCDE EXERCISE---\n\nUser message: ${userMessage}\n\nGuide them through the ABCDE framework step by step, using intelligent probing to get complete information for each element.`
      }));
      
      const response = await this.agent.invoke(
        { messages }, 
        { ...config, recursionLimit: 25 }
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`🧠 CognitiveRestructuringAgent completed in ${elapsed}ms`);
      
      const assistantMessage = response.messages[response.messages.length - 1];
      let content = '';
      
      // Enhanced content extraction with validation
      if (typeof assistantMessage.content === 'string') {
        content = assistantMessage.content.trim();
      } else if (Array.isArray(assistantMessage.content)) {
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
        content = assistantMessage.content.text || 
                 assistantMessage.content.content || 
                 assistantMessage.content.message ||
                 '';
      }
      
      // Validate content
      if (!content || content.trim() === '') {
        console.warn('🧠 CognitiveRestructuringAgent returned empty content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Check for corruption
      if (content.includes('<details>') || 
          content.includes('Safety measures') || 
          content.includes('</details>')) {
        console.warn('🧠 CognitiveRestructuringAgent returned corrupted content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Final validation
      if (!content || content.trim().length < 10) {
        console.warn('🧠 CognitiveRestructuringAgent content too short, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
        
      // Add agent identification
      return `🧠 **Cognitive Restructuring Agent**\n\n${content}`;
        
    } catch (error) {
      console.error('🧠 CognitiveRestructuringAgent error:', error);
      
      const fallback = await createSimpleResponse(userMessage, context);
      console.log('🧠 Using fallback response due to agent error');
      
      return `🧠 **Cognitive Restructuring Agent**\n\n${fallback}`;
    }
  }
} 