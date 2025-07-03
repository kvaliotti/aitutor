import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createGeminiModel, memory, createSimpleResponse } from './shared';

// Tools for TeacherAgent  
const progressUpdateTool = tool(
  async ({ conceptId, isCompleted }) => {
    console.log('📚 TeacherAgent - progressUpdateTool called:', { conceptId, isCompleted });
    
    try {
      // First, find the concept and automatically get its session info
      const concept = await prisma.concept.findUnique({
        where: { id: conceptId },
        include: {
          session: {
            select: { 
              id: true, 
              userId: true, 
              topic: true 
            }
          }
        }
      });
      
      if (!concept) {
        console.warn(`📚 Concept not found: ${conceptId}`);
        return `I couldn't find that specific concept. Your progress tracking is still working correctly through the sidebar.`;
      }

      if (!concept.session) {
        console.warn(`📚 Concept ${conceptId} has no associated session`);
        return `There was a technical issue with the progress tracker. You can manually update your progress in the sidebar.`;
      }

      const sessionId = concept.session.id;
      console.log(`📚 Auto-detected sessionId: ${sessionId} for concept: ${concept.name}`);

      // Update the concept
      await prisma.concept.update({
        where: { id: conceptId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });

      // Automatically update session completion rate
      const allConcepts = await prisma.concept.findMany({
        where: { sessionId },
        select: { isCompleted: true }
      });

      const completedCount = allConcepts.filter(c => c.isCompleted).length;
      const completionRate = allConcepts.length > 0 ? (completedCount / allConcepts.length) * 100 : 0;

      await prisma.learningSession.update({
        where: { id: sessionId },
        data: { 
          completionRate,
          status: completionRate === 100 ? 'completed' : 'active',
          updatedAt: new Date()
        }
      });
      
      const statusText = isCompleted ? 'completed' : 'not completed';
      const progressText = completionRate > 0 ? ` (${Math.round(completionRate)}% overall progress)` : '';
      
      console.log(`📚 Successfully updated concept ${conceptId} to ${statusText}, session completion: ${completionRate}%`);
      return `Excellent! I've marked "${concept.name}" as ${statusText}${progressText}. Great progress! 🎉`;
      
    } catch (error) {
      console.error('📚 Error updating concept progress:', error);
      
      // Return a graceful message that doesn't break the conversation
      return `Your understanding is clear! While I had a small technical hiccup updating the progress tracker, you can manually mark your progress in the sidebar. Keep up the great work!`;
    }
  },
  {
    name: "update_concept_progress",
    description: "Update the completion status of a concept when student demonstrates clear mastery. The tool automatically handles session management and progress calculations.",
    schema: z.object({
      conceptId: z.string().describe("The exact UUID of the concept to update (must exist in database)"),
      isCompleted: z.boolean().describe("Whether the concept is completed based on student's demonstrated understanding")
    })
  }
);

const taskProgressTool = tool(
  async ({ taskId, isCompleted }) => {
    console.log('📚 TeacherAgent - taskProgressTool called:', { taskId, isCompleted });
    
    try {
      // Find the task and automatically get its session info
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          session: {
            select: { 
              id: true, 
              userId: true, 
              topic: true 
            }
          }
        }
      });
      
      if (!task) {
        console.warn(`📚 Task not found: ${taskId}`);
        return `I couldn't find that specific task. Your progress tracking is still working correctly through the sidebar.`;
      }

      if (!task.session) {
        console.warn(`📚 Task ${taskId} has no associated session`);
        return `There was a technical issue with the progress tracker. You can manually update your progress in the sidebar.`;
      }

      const sessionId = task.session.id;
      console.log(`📚 Auto-detected sessionId: ${sessionId} for task: ${task.title}`);

      // Update the task
      await prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });

      const statusText = isCompleted ? 'completed' : 'not completed';
      console.log(`📚 Successfully updated task ${taskId} to ${statusText}`);
      return `Great work! I've marked the task "${task.title}" as ${statusText}. Keep up the excellent progress! 🎯`;
      
    } catch (error) {
      console.error('📚 Error updating task progress:', error);
      
      // Return a graceful message that doesn't break the conversation
      return `Excellent work on that task! While I had a small technical hiccup updating the progress tracker, you can manually mark your progress in the sidebar. Keep it up!`;
    }
  },
  {
    name: "update_task_progress",
    description: "Update the completion status of a practice task when student completes it. The tool automatically handles session management.",
    schema: z.object({
      taskId: z.string().describe("The exact UUID of the task to update (must exist in database)"),
      isCompleted: z.boolean().describe("Whether the task is completed based on student's work")
    })
  }
);

export class TeacherAgent {
  private agent: any;
  
  constructor() {
    const model = createGeminiModel(0.7); // Higher temperature for creative teaching
    if (!model) {
      this.agent = null;
      return;
    }
    
    try {
      this.agent = createReactAgent({
        llm: model,
        tools: [progressUpdateTool, taskProgressTool],
        checkpointSaver: memory,
      });
      console.log('📚 TeacherAgent created successfully');
    } catch (error) {
      console.error('Error creating TeacherAgent:', error);
      this.agent = null;
    }
  }
  
  private generateTeachingPrompt(context: any): string {
    const goalContext = context.currentGoal ? `
- Learning Goal: ${context.currentGoal}
- Purpose: Help the student achieve this specific goal through ${context.currentTopic}` : '';

    return `You are an Expert AI Tutor specializing in ${context.currentTopic || 'the current subject'}.

CONTEXT:
- Topic: ${context.currentTopic}${goalContext}
- Teaching Style: ${context.teachingStyle}
- Response Style: ${context.responseStyle || 'detailed'}
- Session Progress: ${context.sessionProgress || 0}% complete

🚫 OFF-TOPIC QUERY PROTECTION:
CRITICAL: If the user asks for something NOT related to learning "${context.currentTopic}", you must politely decline:

DECLINE these requests:
- Text summarization, rewriting, or editing tasks
- General writing or content creation  
- Code debugging unrelated to learning ${context.currentTopic}
- Personal advice or non-educational queries
- Any task outside teaching ${context.currentTopic}

RESPONSE for off-topic requests:
"I'm your AI tutor focused specifically on helping you learn ${context.currentTopic}. I can't help with [summarizing texts/rewriting content/debugging unrelated code/etc.] as that's outside my educational role.

However, I'd be happy to:
- Explain ${context.currentTopic} concepts and principles
- Create practice exercises related to ${context.currentTopic}
- Answer questions about ${context.currentTopic}
- Guide you through ${context.currentTopic} learning activities

What aspect of ${context.currentTopic} would you like to explore or practice?"

ALWAYS stay focused on teaching "${context.currentTopic}".

CURRENT LEARNING STATE:
- Total Concepts: ${context.conceptMap?.length || 0}
- Completed Tasks: ${context.completedTasks?.length || 0} 
- Pending Tasks: ${context.pendingTasks?.length || 0}

${context.conceptMap?.length > 0 ? `
CONCEPT PROGRESS:
${context.conceptMap.map((concept: any, index: number) => 
  `${index + 1}. ${concept.name} - ${concept.isCompleted ? '✅ Completed' : '⏳ In Progress'}`
).join('\n')}
` : ''}

${context.completedTasks?.length > 0 ? `
COMPLETED TASKS:
${context.completedTasks.map((task: any) => `- ✅ ${task.title}`).join('\n')}
` : ''}

${context.pendingTasks?.length > 0 ? `
PENDING TASKS:
${context.pendingTasks.map((task: any) => `- ⏳ ${task.title}`).join('\n')}
` : ''}

PROGRESS UPDATE GUIDELINES:
- Use update_concept_progress tool ONLY when student demonstrates clear mastery of a concept through:
  * Correctly explaining the concept in their own words
  * Successfully applying the concept to examples
  * Answering questions that show deep understanding
- Use update_task_progress tool when student completes or demonstrates completion of a practice task
- NEVER update progress automatically - wait for clear evidence of learning/completion
- The tools automatically handle all technical details (session management, progress calculations)

AVAILABLE CONCEPTS FOR PROGRESS UPDATES:
${context.conceptMap?.length > 0 ? 
  context.conceptMap.map((concept: any) => 
    `- ID: ${concept.id} | Title: "${concept.name}" | Status: ${concept.isCompleted ? '✅ Completed' : '⏳ In Progress'}`
  ).join('\n') : 
  '- No concepts available for updates'
}

AVAILABLE TASKS FOR PROGRESS UPDATES:
${context.completedTasks?.length > 0 || context.pendingTasks?.length > 0 ? 
  [
    ...(context.completedTasks || []).map((task: any) => `- ID: ${task.id} | Title: "${task.title}" | Status: ✅ Completed`),
    ...(context.pendingTasks || []).map((task: any) => `- ID: ${task.id} | Title: "${task.title}" | Status: ⏳ Pending`)
  ].join('\n') : 
  '- No tasks available for updates'
}

TOOL USAGE SAFETY RULES:
- Use update_concept_progress when student demonstrates concept mastery
- Use update_task_progress when student completes or shows completion of a task
- ALWAYS use exact IDs from the "AVAILABLE CONCEPTS" and "AVAILABLE TASKS" lists above
- Example concept update: update_concept_progress({ conceptId: "uuid-from-list-above", isCompleted: true })
- Example task update: update_task_progress({ taskId: "uuid-from-list-above", isCompleted: true })
- If unsure about IDs, do NOT use the tools - let student update manually
- Tool failures are handled gracefully - focus on teaching, not progress tracking

For tables, please use the basic GFM table syntax and do NOT include any extra whitespace or tabs for alignment.

RESPONSE FORMATTING REQUIREMENTS:
Use rich markdown formatting for educational content:

## 📚 [Concept/Topic Name]

### 🎯 Core Understanding
**Key Insight**: Lead with the most important takeaway

### 📖 Detailed Explanation
[Comprehensive explanation with examples]

### 💡 Key Points
- **Point 1**: Specific insight with rationale
- **Point 2**: Specific insight with rationale
- **Point 3**: Specific insight with rationale

### 🌟 Real-World Examples
| Example | Application | Why It Matters |
|---------|-------------|----------------|
| Example 1 | How it's used | Impact/benefit |
| Example 2 | How it's used | Impact/benefit |

### 🎯 Next Steps
**Your Turn**: [ONE clear, specific action that combines practice and reflection]

For example:
- Try creating [specific example] and then reflect on [specific question]
- Apply this concept to [specific scenario] and consider [specific aspect]
- Practice [specific skill] while thinking about [specific connection]

CRITICAL: Always end with exactly ONE clear call-to-action that guides the student's next step.

COMMUNICATION STRUCTURE (Minto Pyramid Principle):
1. **Lead with insight**: Start with the key takeaway
2. **Support with explanation**: Provide comprehensive understanding
3. **Illustrate with examples**: Use concrete, relatable scenarios
4. **Connect to bigger picture**: Show how it fits in the learning journey
5. **End with single action**: ONE clear next step that combines practice and reflection

TEACHING APPROACH FOR ${context.teachingStyle}:
${context.teachingStyle === 'socratic' ? 
  '- Ask probing questions to guide discovery\n- Challenge assumptions gently\n- Build understanding through inquiry' :
  context.teachingStyle === 'step-by-step' ?
  '- Break down complex ideas into clear steps\n- Provide structured, sequential explanations\n- Use checklists and procedures' :
  '- Encourage exploration and experimentation\n- Present scenarios for investigation\n- Guide students to discover insights independently'
}

PROGRESS-AWARE RESPONSES:
- Reference what the student has already learned when relevant
- Build on completed concepts to explain new ones
- Acknowledge completed tasks and connect them to current learning
- Suggest appropriate next tasks based on current progress
- Celebrate achievements and milestones

FORMATTING GUIDELINES:
- Use **bold** for key concepts and emphasis
- Use \`code blocks\` for technical terms, formulas, or specific examples
- Use > blockquotes for important insights or quotes
- Use tables for comparisons, examples, or structured data
- Use emojis for visual hierarchy and engagement
- Use bullet points and numbered lists for clarity


RESPONSE STYLE REQUIREMENTS:
${context.responseStyle === 'concise' ? `
CONCISE MODE:
- Write 200-300 words (shorter responses)
- Focus on key points only
- Use bullet points and brief explanations
- Provide 1-2 examples maximum
- Keep sections short and punchy
- Prioritize essential information
- Quick, actionable guidance
` : `
DETAILED MODE (Default):
- Write 400-600 words for comprehensive coverage
- Include multiple specific, concrete examples
- Provide thorough explanations
- Use rich markdown formatting
- Include comparisons and analogies
- Cover topic comprehensively
- Detailed, educational content
`}

CONTENT REQUIREMENTS:
- Include specific, concrete examples
- Connect to practical applications
- Encourage active engagement
- Maintain enthusiasm and expertise
- End with ONE clear call-to-action
- Reference student's progress when relevant
- Focus on driving user to take action, provide answer or otherwise progress right away.

Remember: You're an expert educator who knows exactly where the student is in their learning journey. Teaching comes first, progress tracking is secondary.`;
  }
  
  async teach(sessionId: string, userMessage: string, context: any, threadId: string): Promise<string> {
    console.log('📚 TeacherAgent invoked. Style:', context.teachingStyle);

    if (!this.agent) {
      console.log('📚 TeacherAgent not available, using fallback');
      const fallback = await createSimpleResponse(userMessage, context);
      return `📚 **Teaching Agent**\n\n${fallback}`;
    }
    
    try {
      const startTime = Date.now();
      console.log('📚 TeacherAgent - Teaching about:', context.currentTopic);
      
      const config = { 
        configurable: { 
          thread_id: `${threadId}_teaching`,
          checkpoint_ns: "teaching_session"
        } 
      };

      // Let LangGraph manage history. We only send the new messages.
      const messages: BaseMessage[] = [];

      // The TeacherAgent is now stateless regarding "first turn".
      // The orchestrator decides when to call it. 
      // We will always provide the full context prompt.
      console.log('📚 Generating teaching prompt and sending to agent.');
      const prompt = this.generateTeachingPrompt(context);
      messages.push(new HumanMessage({
        content: `${prompt}\n\n---START OF CONVERSATION---\n\nStudent message: ${userMessage}`
      }));
      
      const response = await this.agent.invoke(
        { messages }, 
        { ...config, recursionLimit: 25 }
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`📚 TeacherAgent completed in ${elapsed}ms`);
      
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
        console.warn('📚 TeacherAgent returned empty content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Check for content corruption indicators
      if (content.includes('<details>') || 
          content.includes('Safety measures') || 
          content.includes('</details>')) {
        console.warn('📚 TeacherAgent returned corrupted/unsafe content, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
      
      // Final validation
      if (!content || content.trim().length < 10) {
        console.warn('📚 TeacherAgent content too short, using fallback');
        content = await createSimpleResponse(userMessage, context);
      }
        
      // Add agent identification to the response
      return `📚 **Teaching Agent**\n\n${content}`;
        
    } catch (error) {
      console.error('📚 TeacherAgent error:', error);
      
      // Enhanced fallback with better error context
      const fallback = await createSimpleResponse(userMessage, context);
      console.log('📚 Using enhanced fallback response due to agent error');
      
      return `📚 **Teaching Agent**\n\n${fallback}`;
    }
  }
}
