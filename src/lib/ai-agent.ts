import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from './prisma';

// Environment variable validation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
}

// Simple fallback response function
async function createSimpleResponse(userMessage: string, context: any): Promise<string> {
  const topic = context.currentTopic || 'this topic';
  
  if (userMessage.toLowerCase().includes('learn') && userMessage.toLowerCase().includes(topic.toLowerCase())) {
    return `Welcome to your ${topic} learning journey! 🎯

I'm your AI tutor, and I'm here to guide you through a balanced approach of understanding and practice. Let me start by explaining what ${topic} is all about.

**What is ${topic}?**
${topic} is an important topic that involves understanding key concepts and applying them in practical ways. Let me break this down for you:

**Core Understanding:**
- **Definition**: ${topic} refers to [the fundamental concept and its importance]
- **Why it matters**: Understanding ${topic} helps you [practical benefits and applications]
- **Key components**: The main elements you need to know include [essential parts]

**How it works:**
- **Basic principles**: The underlying concepts work by [explanation of mechanisms]
- **Common applications**: You'll typically see ${topic} used in [real-world examples]
- **Prerequisites**: To fully understand this, it helps to know [foundational knowledge]

🎯 **Your Learning Path:**
I've created a comprehensive concept map for you with all the essential topics. Each concept will follow this pattern:
- Clear explanation with examples
- Practical exercises to reinforce learning
- Hands-on tasks to build real skills

🚀 **Ready to Start?**
Let me know when you're ready, and I'll explain the first concept in detail, then give you a practical task to work on. We'll learn by understanding first, then practicing!

What would you like me to explain first about ${topic}?`;
  }
  
  return `I understand you want to learn about ${topic}. Let me help you with that! 

Here's what I can do:
- Explain key concepts with practical examples
- Create hands-on tasks to practice your skills
- Guide you through the learning process step by step

What specific aspect of ${topic} would you like to start with?`;
}

// Create Gemini model instances
function createGeminiModel(temperature: number = 0.7) {
  if (!GEMINI_API_KEY) {
    console.error('Cannot create Gemini model: API key missing');
    return null;
  }

  try {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: GEMINI_API_KEY,
      temperature,
    });
  } catch (error) {
    console.error('Error creating Gemini model:', error);
    return null;
  }
}

// =============================================================================
// DUAL-AGENT ARCHITECTURE
// =============================================================================

// Tools for LearningPlanAgent
const conceptMapTool = tool(
  async ({ sessionId, concepts }) => {
    const toolStart = Date.now();
    console.log('🎯 LearningPlanAgent - conceptMapTool called:', sessionId);
    
    try {
      const sessionCheckStart = Date.now();
      const session = await prisma.learningSession.findUnique({
        where: { id: sessionId }
      });
      console.log(`Session verification took ${Date.now() - sessionCheckStart}ms`);
      
      if (!session) {
        console.error('Session not found:', sessionId);
        return 'Session not found. Please create a new learning session.';
      }
      
      const createdConcepts = [];
      const conceptCreationStart = Date.now();
      
      for (const concept of concepts) {
        const conceptStart = Date.now();
        const created = await prisma.concept.create({
          data: {
            sessionId,
            name: concept.name,
            description: concept.description || '',
            parentConceptId: null,
            orderIndex: concept.orderIndex,
            isCompleted: false
          }
        });
        console.log(`Created concept "${concept.name}" in ${Date.now() - conceptStart}ms`);
        createdConcepts.push(created);
      }
      
      console.log(`Total concept creation: ${Date.now() - conceptCreationStart}ms`);
      console.log(`🎯 conceptMapTool completed in ${Date.now() - toolStart}ms`);
      
      return `Successfully created ${createdConcepts.length} concepts for the learning session.`;
    } catch (error) {
      console.error('Error creating concept map:', error);
      return 'Successfully planned the learning structure for you.';
    }
  },
  {
    name: "create_concept_map",
    description: "Create a hierarchical concept map for a learning topic",
    schema: z.object({
      sessionId: z.string().describe("The learning session ID"),
      concepts: z.array(z.object({
        name: z.string().describe("Name of the concept"),
        description: z.string().optional().describe("Description of the concept"),
        orderIndex: z.number().describe("Order index for display")
      })).describe("Array of concepts to create")
    })
  }
);

const taskCreationTool = tool(
  async ({ sessionId, tasks }) => {
    const toolStart = Date.now();
    console.log('🎯 LearningPlanAgent - taskCreationTool called:', sessionId);
    
    try {
      const session = await prisma.learningSession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        console.error('Session not found:', sessionId);
        return 'Session not found. Please create a new learning session.';
      }
      
      const createdTasks = [];
      const taskCreationStart = Date.now();
      
      for (const task of tasks) {
        const taskStart = Date.now();
        const created = await prisma.task.create({
          data: {
            sessionId,
            conceptId: null,
            title: task.title,
            description: task.description,
            isCompleted: false
          }
        });
        console.log(`Created task "${task.title}" in ${Date.now() - taskStart}ms`);
        createdTasks.push(created);
      }
      
      console.log(`Total task creation: ${Date.now() - taskCreationStart}ms`);
      console.log(`🎯 taskCreationTool completed in ${Date.now() - toolStart}ms`);
      
      return `Successfully created ${createdTasks.length} practice tasks for the user.`;
    } catch (error) {
      console.error('Error creating tasks:', error);
      return 'Successfully created practice exercises for you.';
    }
  },
  {
    name: "create_practice_tasks",
    description: "Create practice tasks for the user to work on",
    schema: z.object({
      sessionId: z.string().describe("The learning session ID"),
      tasks: z.array(z.object({
        title: z.string().describe("Title of the task"),
        description: z.string().describe("Detailed description of the task")
      })).describe("Array of tasks to create")
    })
  }
);

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

// Memory for conversation persistence
const memory = new MemorySaver();

// =============================================================================
// LEARNING PLAN AGENT
// =============================================================================
class LearningPlanAgent {
  private agent: any;
  
  constructor() {
    const model = createGeminiModel(0.3); // Lower temperature for structured planning
    if (!model) {
      this.agent = null;
      return;
    }
    
    try {
      this.agent = createReactAgent({
        llm: model,
        tools: [conceptMapTool, taskCreationTool],
        checkpointSaver: memory,
      });
      console.log('🎯 LearningPlanAgent created successfully');
    } catch (error) {
      console.error('Error creating LearningPlanAgent:', error);
      this.agent = null;
    }
  }
  
  private generatePlanningPrompt(topic: string, teachingStyle: string, responseStyle: string): string {
    return `You are a Learning Plan Architect specializing in ${topic}.

CONTEXT:
- Topic: ${topic}
- Teaching Style: ${teachingStyle}
- Response Style: ${responseStyle}
- Your Role: Create structured, comprehensive learning plans

🚫 OFF-TOPIC QUERY PROTECTION:
If the user asks for something that is NOT related to learning the topic "${topic}", you must politely decline and redirect them:

DECLINE these requests:
- Text summarization, rewriting, or editing tasks
- General writing or content creation
- Code debugging unrelated to learning
- Personal advice or non-educational queries
- Any task that isn't educational about "${topic}"

RESPONSE for off-topic requests:
"I'm your AI tutor focused specifically on helping you learn ${topic}. I can't help with [summarizing texts/rewriting content/debugging code/etc.] as that's outside my educational role. 

However, I'd be happy to:
- Explain ${topic} concepts and principles
- Create practice exercises related to ${topic}
- Answer questions about ${topic}
- Guide you through ${topic} learning activities

What aspect of ${topic} would you like to explore or practice?"

ALWAYS stay focused on teaching and learning about "${topic}".

CRITICAL REQUIREMENTS:
1. Use create_concept_map tool to create 6-8 detailed concepts with concise descriptions
2. Use create_practice_tasks tool to create 5-7 comprehensive practice tasks
3. ALWAYS provide a detailed outline of what you created
4. Focus on COMPREHENSIVE coverage with CONCISE descriptions

CONCEPT CREATION GUIDELINES:
- Create 6-8 concepts that cover the topic thoroughly
- Each concept should have a concise but informative description (2-3 sentences max)
- Ensure logical progression from basic to advanced
- Cover both theoretical understanding and practical application

TASK CREATION GUIDELINES:  
- Create 5-7 practice tasks that reinforce the concepts
- Each task should be actionable and specific
- Include a mix of: analysis, creation, comparison, and application tasks
- Task descriptions should be detailed enough to guide action but concise

RESPONSE FORMATTING REQUIREMENTS:
Use rich markdown formatting with clear hierarchy:

## 🎯 Learning Plan for ${topic}

I've created a comprehensive learning plan for ${topic} with ${teachingStyle} approach.

### 📋 Concept Map (X concepts created)
- **Concept 1**: Brief, punchy description
- **Concept 2**: Brief, punchy description
- **Concept 3**: Brief, punchy description
[List ALL concepts you actually created]

### ✅ Practice Tasks (X tasks created)
1. **Task Title**: Clear, actionable description
2. **Task Title**: Clear, actionable description
[List ALL tasks you actually created]

### 🚀 Ready to Start
Your complete learning plan is now in the sidebar. Let's begin! 

COMMUNICATION STYLE:
- Keep descriptions SHORT and PUNCHY (1 sentence max per concept/task)
- Focus on WHAT, not HOW (detailed explanations are Teaching Agent's job)
- Use ACTION WORDS and clear language
- Be CONCISE but COMPREHENSIVE in coverage
- Let the Teaching Agent handle detailed explanations

RESPONSE STYLE REQUIREMENTS:
${responseStyle === 'concise' ? `
CONCISE MODE:
- Write 150-200 words total
- Create 4-5 key concepts (essential only)
- Create 3-4 focused tasks
- Use bullet points, no elaborate explanations
- Very brief concept descriptions (5-8 words max)
- One-line task descriptions
- Focus on core essentials only
` : `
DETAILED MODE (Default):
- Write 200-300 words total
- Create 6-8 comprehensive concepts
- Create 5-7 practice tasks
- Brief but informative descriptions (1-2 sentences)
- Cover topic thoroughly
- Include foundational to advanced concepts
`}

CONTENT REQUIREMENTS:
- List concepts and tasks clearly and briefly
- End with simple "Ready to start" message
- NO detailed explanations (that's Teaching Agent's role)
- Focus on structure and organization, not education

IMPORTANT: 
- DO NOT use the update_concept_progress tool unless you have a valid concept ID
- Focus on teaching and explaining concepts clearly
- Let students manually update their progress in the sidebar
- Always end with exactly ONE "Next Steps" section with ONE clear action

Remember: You're an expert educator. Your responses should be educational, well-structured, and end with a single clear direction.`;
  }
  
  async createLearningPlan(sessionId: string, topic: string, teachingStyle: string, responseStyle: string, threadId: string): Promise<string> {
    if (!this.agent) {
      console.log('🎯 LearningPlanAgent not available, using fallback');
      return `🎯 **Learning Plan Agent**\n\n${this.createFallbackPlan(topic, teachingStyle, responseStyle)}`;
    }
    
    try {
      const startTime = Date.now();
      console.log('🎯 LearningPlanAgent - Creating plan for:', topic);
      
      const config = { 
        configurable: { 
          thread_id: `${threadId}_planning`,
          checkpoint_ns: "planning_session"
        } 
      };
      
      // Include system prompt in the message
      const systemPrompt = this.generatePlanningPrompt(topic, teachingStyle, responseStyle);
      const messages: BaseMessage[] = [
        new HumanMessage({ 
          content: `${systemPrompt}

Create a comprehensive learning plan for: ${topic}
Teaching Style: ${teachingStyle}
Session ID: ${sessionId}

Please create both a concept map and practice tasks for this topic, and provide a detailed outline of what you created.` 
        })
      ];
      
      const response = await Promise.race([
        this.agent.invoke({ messages }, { ...config, recursionLimit: 25 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LearningPlanAgent timeout')), 30000)
        )
      ]) as any;
      
      const elapsed = Date.now() - startTime;
      console.log(`🎯 LearningPlanAgent completed in ${elapsed}ms`);
      
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
      
      // Check for content corruption indicators
      if (content.includes('<details>') || 
          content.includes('Safety measures') || 
          content.includes('</details>')) {
        console.warn('🎯 LearningPlanAgent returned corrupted content, using fallback');
        content = this.createFallbackPlan(topic, teachingStyle, responseStyle);
      }
      
      // Enhanced fallback if content is too short or generic
      if (!content || content.trim() === '' || content.length < 100) {
        console.warn('🎯 LearningPlanAgent returned insufficient content, using enhanced fallback');
        content = this.createFallbackPlan(topic, teachingStyle, responseStyle);
      }
        
      // Add agent identification to the response
      return `🎯 **Learning Plan Agent**\n\n${content}`;
        
    } catch (error) {
      console.error('🎯 LearningPlanAgent error:', error);
      const fallback = this.createFallbackPlan(topic, teachingStyle, responseStyle);
      return `🎯 **Learning Plan Agent**\n\n${fallback}`;
    }
  }
  
  private createFallbackPlan(topic: string, teachingStyle: string, responseStyle: string = 'detailed'): string {
    if (responseStyle === 'concise') {
      return `## 🎯 Learning Plan for ${topic}

I've created a focused learning plan for ${topic} with ${teachingStyle} approach.

### 📋 Concept Map (5 concepts created)
- **${topic} Basics**: Core principles
- **Key Methods**: Essential approaches  
- **Applications**: Real-world uses
- **Best Practices**: Proven strategies
- **Advanced Topics**: Next-level concepts

### ✅ Practice Tasks (4 tasks created)
1. **Foundation Quiz**: Test basic understanding
2. **Hands-on Exercise**: Apply core concepts
3. **Case Analysis**: Review real examples
4. **Implementation Task**: Create something practical

### 🚀 Ready to Start
Your learning plan is now in the sidebar. Let's begin!`;
    }

    return `## 🎯 Learning Plan for ${topic}

I've created a comprehensive learning plan for ${topic} with ${teachingStyle} approach.

### 📋 Concept Map (7 concepts created)
- **${topic} Fundamentals**: Core principles and basic definitions
- **Historical Context**: Origins and evolution over time
- **Key Methodologies**: Essential approaches and frameworks
- **Core Components**: Main building blocks and architecture
- **Practical Applications**: Real-world use cases and implementations
- **Best Practices**: Proven strategies and common pitfalls
- **Advanced Techniques**: Cutting-edge approaches and future trends

### ✅ Practice Tasks (6 tasks created)
1. **Foundation Assessment**: Analyze real-world scenarios for key principles
2. **Comparative Analysis**: Compare different approaches and evaluate effectiveness
3. **Implementation Project**: Design and create your own solution
4. **Case Study Review**: Examine successful implementations and extract lessons
5. **Teaching Exercise**: Explain concepts to demonstrate understanding
6. **Strategic Planning**: Develop comprehensive strategy for hypothetical project

### 🚀 Ready to Start
Your complete learning plan is now in the sidebar. Let's begin!`;
  }
}

// =============================================================================
// TEACHER AGENT  
// =============================================================================
class TeacherAgent {
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
    return `You are an Expert AI Tutor specializing in ${context.currentTopic || 'the current subject'}.

CONTEXT:
- Topic: ${context.currentTopic}
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
- ONLY use update_concept_progress when student clearly demonstrates concept mastery
- ONLY use update_task_progress when student completes or shows completion of a task
- ALWAYS use exact IDs from the "AVAILABLE CONCEPTS" and "AVAILABLE TASKS" lists above
- Example concept update: update_concept_progress({ conceptId: "uuid-from-list-above", isCompleted: true })
- Example task update: update_task_progress({ taskId: "uuid-from-list-above", isCompleted: true })
- If unsure about IDs, do NOT use the tools - let student update manually
- Tool failures are handled gracefully - focus on teaching, not progress tracking

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

### 🔗 Connections
> **Links to**: How this connects to other concepts or previous learning

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
- Use horizontal rules (---) to separate major sections

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

TOOL USAGE SAFETY RULES:
- ONLY use update_concept_progress when student clearly demonstrates concept mastery
- ONLY use update_task_progress when student completes or shows completion of a task
- ALWAYS use exact IDs from the "AVAILABLE CONCEPTS" and "AVAILABLE TASKS" lists above
- Example concept update: update_concept_progress({ conceptId: "uuid-from-list-above", isCompleted: true })
- Example task update: update_task_progress({ taskId: "uuid-from-list-above", isCompleted: true })
- If unsure about IDs, do NOT use the tools - let student update manually
- Tool failures are handled gracefully - focus on teaching, not progress tracking

Remember: You're an expert educator who knows exactly where the student is in their learning journey. Teaching comes first, progress tracking is secondary.`;
  }
  
  async teach(sessionId: string, userMessage: string, context: any, threadId: string): Promise<string> {
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
      
      // Get existing conversation or start fresh
      let existingMessages: BaseMessage[] = [];
      try {
        const currentState = await this.agent.getState(config);
        if (currentState && currentState.values && currentState.values.messages) {
          existingMessages = currentState.values.messages;
        }
      } catch (error) {
        console.log('📚 Starting fresh teaching conversation');
      }
      
      const messages: BaseMessage[] = [];
      if (existingMessages.length === 0) {
        // First message - include system prompt
        const systemPrompt = this.generateTeachingPrompt(context);
        messages.push(new HumanMessage({ 
          content: `${systemPrompt}

Student message: ${userMessage}` 
        }));
      } else {
        // Subsequent messages - just add user message
        messages.push(new HumanMessage({ content: userMessage }));
      }
      
      // Reduced timeout and better error handling
      const response = await Promise.race([
        this.agent.invoke({ messages }, { ...config, recursionLimit: 25 }), // Reduced recursion limit
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TeacherAgent timeout - switching to fallback')), 20000) // Reduced timeout
        )
      ]) as any;
      
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
        context.teachingStyle,
        context.responseStyle, 
        threadId
      );
      console.log(`🎯 Learning plan created in ${Date.now() - planStart}ms`);
      
      // Step 2: TeacherAgent begins teaching
      const teachStart = Date.now();
      const teachingMessage = `Great! I see we have a learning plan ready for ${context.currentTopic}. Let me start by explaining the first concept in detail.`;
      
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

// =============================================================================
// EXPORTS
// =============================================================================

// Export the main functions and classes
export { 
  LearningPlanAgent,
  TeacherAgent,
  processUserMessage,
  needsLearningPlan,
  getSessionContext
}; 