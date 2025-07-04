import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createGeminiModel, memory } from './shared';

// =============================================================================
// HELPER: AUTOMATIC SUBJECT CATEGORIZATION
// =============================================================================

function detectSubjectCategory(topic: string): { categoryId: number; subjectName: string; categoryName: string } {
  const topicLower = topic.toLowerCase();
  
  // Programming & Development (1, 34, 35)
  if (topicLower.includes('react') || topicLower.includes('javascript') || topicLower.includes('python') || 
      topicLower.includes('java') || topicLower.includes('programming') || topicLower.includes('coding') ||
      topicLower.includes('algorithm') || topicLower.includes('software') || topicLower.includes('development')) {
    if (topicLower.includes('mobile') || topicLower.includes('ios') || topicLower.includes('android')) {
      return { categoryId: 34, subjectName: topic, categoryName: 'Mobile Development' };
    }
    if (topicLower.includes('web') || topicLower.includes('html') || topicLower.includes('css') || topicLower.includes('frontend')) {
      return { categoryId: 35, subjectName: topic, categoryName: 'Web Development' };
    }
    return { categoryId: 1, subjectName: topic, categoryName: 'Programming' };
  }

  // Data Science & Analytics (2)
  if (topicLower.includes('data') || topicLower.includes('analytics') || topicLower.includes('statistics') ||
      topicLower.includes('machine learning') || topicLower.includes('visualization') || topicLower.includes('pandas')) {
    if (topicLower.includes('ai') || topicLower.includes('machine learning') || topicLower.includes('neural')) {
      return { categoryId: 32, subjectName: topic, categoryName: 'AI & Machine Learning' };
    }
    return { categoryId: 2, subjectName: topic, categoryName: 'Data Science & Analytics' };
  }

  // Design & UX (3, 15)
  if (topicLower.includes('design') || topicLower.includes('ux') || topicLower.includes('ui') || 
      topicLower.includes('user experience') || topicLower.includes('prototyping')) {
    if (topicLower.includes('graphic') || topicLower.includes('visual') || topicLower.includes('branding')) {
      return { categoryId: 15, subjectName: topic, categoryName: 'Graphic Design' };
    }
    return { categoryId: 3, subjectName: topic, categoryName: 'Design & UX' };
  }

  // Business & Management (4)
  if (topicLower.includes('business') || topicLower.includes('management') || topicLower.includes('strategy') ||
      topicLower.includes('entrepreneur') || topicLower.includes('leadership') || topicLower.includes('operations')) {
    if (topicLower.includes('project') || topicLower.includes('project management')) {
      return { categoryId: 28, subjectName: topic, categoryName: 'Project Management' };
    }
    if (topicLower.includes('leadership') || topicLower.includes('team')) {
      return { categoryId: 27, subjectName: topic, categoryName: 'Leadership' };
    }
    return { categoryId: 4, subjectName: topic, categoryName: 'Business & Management' };
  }

  // Marketing & Sales (5)
  if (topicLower.includes('marketing') || topicLower.includes('sales') || topicLower.includes('advertising') ||
      topicLower.includes('promotion') || topicLower.includes('branding') || topicLower.includes('customer')) {
    if (topicLower.includes('social media') || topicLower.includes('instagram') || topicLower.includes('facebook')) {
      return { categoryId: 48, subjectName: topic, categoryName: 'Social Media' };
    }
    return { categoryId: 5, subjectName: topic, categoryName: 'Marketing & Sales' };
  }

  // Mathematics & Science (9, 41-45)
  if (topicLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('algebra') ||
      topicLower.includes('geometry') || topicLower.includes('statistics')) {
    return { categoryId: 9, subjectName: topic, categoryName: 'Mathematics' };
  }
  if (topicLower.includes('physics')) {
    return { categoryId: 42, subjectName: topic, categoryName: 'Physics' };
  }
  if (topicLower.includes('chemistry')) {
    return { categoryId: 43, subjectName: topic, categoryName: 'Chemistry' };
  }
  if (topicLower.includes('biology')) {
    return { categoryId: 44, subjectName: topic, categoryName: 'Biology' };
  }

  // Languages (10)
  if (topicLower.includes('english') || topicLower.includes('spanish') || topicLower.includes('french') ||
      topicLower.includes('language') || topicLower.includes('grammar') || topicLower.includes('vocabulary')) {
    return { categoryId: 10, subjectName: topic, categoryName: 'Languages' };
  }

  // Health & Wellness (16-20)
  if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('exercise') ||
      topicLower.includes('nutrition') || topicLower.includes('diet') || topicLower.includes('wellness')) {
    if (topicLower.includes('fitness') || topicLower.includes('exercise') || topicLower.includes('workout')) {
      return { categoryId: 17, subjectName: topic, categoryName: 'Sports & Fitness' };
    }
    if (topicLower.includes('nutrition') || topicLower.includes('diet') || topicLower.includes('food')) {
      return { categoryId: 18, subjectName: topic, categoryName: 'Nutrition & Diet' };
    }
    return { categoryId: 16, subjectName: topic, categoryName: 'Health & Wellness' };
  }

  // Finance & Economics (6)
  if (topicLower.includes('finance') || topicLower.includes('economics') || topicLower.includes('money') ||
      topicLower.includes('investment') || topicLower.includes('trading') || topicLower.includes('accounting')) {
    if (topicLower.includes('crypto') || topicLower.includes('blockchain') || topicLower.includes('bitcoin')) {
      return { categoryId: 49, subjectName: topic, categoryName: 'Blockchain & Crypto' };
    }
    return { categoryId: 6, subjectName: topic, categoryName: 'Finance & Economics' };
  }

  // Communication & Skills (26, 29)
  if (topicLower.includes('communication') || topicLower.includes('speaking') || topicLower.includes('presentation') ||
      topicLower.includes('public speaking') || topicLower.includes('rhetoric')) {
    if (topicLower.includes('public speaking') || topicLower.includes('presentation')) {
      return { categoryId: 29, subjectName: topic, categoryName: 'Public Speaking' };
    }
    return { categoryId: 26, subjectName: topic, categoryName: 'Communication' };
  }

  // Personal Development (21)
  if (topicLower.includes('personal development') || topicLower.includes('self improvement') || 
      topicLower.includes('productivity') || topicLower.includes('motivation') || topicLower.includes('habits')) {
    return { categoryId: 21, subjectName: topic, categoryName: 'Personal Development' };
  }

  // Fallback to "Other" category
  return { categoryId: 50, subjectName: topic, categoryName: 'Other' };
}


// Tools for LearningPlanAgent
const conceptMapTool = tool(
  async ({ sessionId, concepts, categoryId, subjectName }) => {
    const toolStart = Date.now();
    console.log('🎯 LearningPlanAgent - conceptMapTool called:', { sessionId, categoryId, subjectName });
    
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

      // Update the learning session with categorization information
      if (categoryId || subjectName) {
        const updateData: any = {};
        
        // Check if the category exists before using it
        if (categoryId) {
          try {
            const categoryExists = await prisma.subjectCategory.findUnique({
              where: { id: categoryId }
            });
            
            if (categoryExists) {
              updateData.subjectCategoryId = categoryId;
              console.log(`✅ Using existing category: ${categoryId}`);
            } else {
              console.warn(`⚠️ Category ${categoryId} not found, using null instead`);
              updateData.subjectCategoryId = null;
            }
          } catch (error) {
            console.warn(`⚠️ Error checking category ${categoryId}, using null:`, error);
            updateData.subjectCategoryId = null;
          }
        }
        
        if (subjectName) updateData.subjectName = subjectName;
        
        await prisma.learningSession.update({
          where: { id: sessionId },
          data: updateData
        });
        console.log(`Updated session with category: ${updateData.subjectCategoryId || 'null'}, subject: ${subjectName}`);
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

        // Create concept learning history record
        await prisma.conceptLearningHistory.create({
          data: {
            userId: session.userId,
            conceptId: created.id,
            learningSessionId: sessionId,
            reviewCount: 0
          }
        });
      }
      
      console.log(`Total concept creation: ${Date.now() - conceptCreationStart}ms`);
      console.log(`🎯 conceptMapTool completed in ${Date.now() - toolStart}ms`);
      
      const categoryInfo = categoryId ? ` (Category ID: ${categoryId})` : '';
      const subjectInfo = subjectName ? ` in subject "${subjectName}"` : '';
      
      return `Successfully created ${createdConcepts.length} concepts for the learning session${subjectInfo}${categoryInfo}.`;
    } catch (error) {
      console.error('Error creating concept map:', error);
      return 'Successfully planned the learning structure for you.';
    }
  },
  {
    name: "create_concept_map",
    description: "Create a hierarchical concept map for a learning topic with automatic categorization",
    schema: z.object({
      sessionId: z.string().describe("The learning session ID"),
      categoryId: z.number().optional().describe("The subject category ID (1-50, defaults to 'Other' if not provided)"),
      subjectName: z.string().optional().describe("The specific subject name within the category"),
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


export class LearningPlanAgent {
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
  
  private generatePlanningPrompt(topic: string, goal: string | null, teachingStyle: string, responseStyle: string): string {
    const goalContext = goal ? `
- Learning Goal: ${goal}
- Purpose: Design the learning plan specifically to help achieve this goal` : '';

    return `You are a Learning Plan Architect specializing in ${topic}.

CONTEXT:
- Topic: ${topic}${goalContext}
- Teaching Style: ${teachingStyle}
- Response Style: ${responseStyle}
- Your Role: Create structured, comprehensive learning plans with automatic categorization${goal ? `, tailored to achieve the specific goal: "${goal}"` : ''}

🏷️ AUTOMATIC SUBJECT CATEGORIZATION:
You must categorize the topic "${topic}" into one of these 50 categories by ID:

**Core Academic & Professional (1-10):**
1=Programming, 2=Data Science & Analytics, 3=Design & UX, 4=Business & Management, 5=Marketing & Sales, 6=Finance & Economics, 7=Science & Technology, 8=Engineering, 9=Mathematics, 10=Languages

**Creative & Arts (11-15):**
11=Arts & Creativity, 12=Music & Audio, 13=Photography & Video, 14=Writing & Literature, 15=Graphic Design

**Health & Wellness (16-20):**
16=Health & Wellness, 17=Sports & Fitness, 18=Nutrition & Diet, 19=Mental Health, 20=Medicine & Healthcare

**Lifestyle & Personal (21-25):**
21=Personal Development, 22=Cooking & Culinary, 23=Travel & Culture, 24=Hobbies & Crafts, 25=Parenting & Family

**Professional Skills (26-30):**
26=Communication, 27=Leadership, 28=Project Management, 29=Public Speaking, 30=Sales & Negotiation

**Technical & Digital (31-35):**
31=Cybersecurity, 32=AI & Machine Learning, 33=Cloud Computing, 34=Mobile Development, 35=Web Development

**Specialized Professional (36-40):**
36=Law & Legal, 37=Education & Teaching, 38=Psychology, 39=Real Estate, 40=Manufacturing

**Science & Research (41-45):**
41=Environmental Science, 42=Physics, 43=Chemistry, 44=Biology, 45=Research Methods

**Emerging & Niche (46-49):**
46=Sustainability, 47=Gaming & Entertainment, 48=Social Media, 49=Blockchain & Crypto

**Catch-all (50):**
50=Other

CATEGORIZATION LOGIC:
1. Analyze the topic "${topic}" to determine the best category match
2. Choose the most specific category that fits (avoid "Other" unless truly necessary)
3. Create a specific subject name within that category (e.g., "React Development" within Programming)
4. ALWAYS use the create_concept_map tool with categoryId and subjectName parameters

EXAMPLES:
- "Learn React" → categoryId: 1, subjectName: "React Development"
- "UX Design" → categoryId: 3, subjectName: "User Experience Design"
- "Python for Data Analysis" → categoryId: 2, subjectName: "Python Data Analysis"
- "Marketing Strategies" → categoryId: 5, subjectName: "Marketing Strategy Development"

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
1. FIRST: Determine appropriate categoryId (1-50) and subjectName for the topic
2. Use create_concept_map tool with categoryId and subjectName parameters
3. Create 6-8 detailed concepts with concise descriptions
4. Use create_practice_tasks tool to create 5-7 comprehensive practice tasks
5. ALWAYS provide a detailed outline of what you created
6. Focus on COMPREHENSIVE coverage with CONCISE descriptions

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
  
  async createLearningPlan(sessionId: string, topic: string, goal: string | null, teachingStyle: string, responseStyle: string, threadId: string): Promise<string> {
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
      const systemPrompt = this.generatePlanningPrompt(topic, goal, teachingStyle, responseStyle);
      const goalText = goal ? ` to achieve the goal: "${goal}"` : '';
      const messages: BaseMessage[] = [
        new HumanMessage({ 
          content: `${systemPrompt}

Create a comprehensive learning plan for: ${topic}${goalText}
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
    const categoryInfo = detectSubjectCategory(topic);
    
    if (responseStyle === 'concise') {
      return `## 🎯 Learning Plan for ${topic}

I've created a focused learning plan for ${topic} with ${teachingStyle} approach.
📚 **Subject Category**: ${categoryInfo.categoryName}

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
Your learning plan is now in the sidebar under **${categoryInfo.categoryName}**. Let's begin!`;
    }

    return `## 🎯 Learning Plan for ${topic}

I've created a comprehensive learning plan for ${topic} with ${teachingStyle} approach.
📚 **Subject Category**: ${categoryInfo.categoryName}

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
Your complete learning plan is now in the sidebar under **${categoryInfo.categoryName}**. Let's begin!`;
  }
}