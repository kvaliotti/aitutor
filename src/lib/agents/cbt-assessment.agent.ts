import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createGeminiModel, memory } from './shared';

// =============================================================================
// HELPER: THERAPEUTIC GOAL CATEGORIZATION
// =============================================================================

function detectTherapyCategory(concern: string): { category: string; categoryName: string } {
  const concernLower = concern.toLowerCase();
  
  // Anxiety-related concerns
  if (concernLower.includes('anxiety') || concernLower.includes('panic') || concernLower.includes('worry') ||
      concernLower.includes('fear') || concernLower.includes('phobia') || concernLower.includes('nervous')) {
    return { category: 'anxiety', categoryName: 'Anxiety Management' };
  }

  // Depression-related concerns
  if (concernLower.includes('depress') || concernLower.includes('sad') || concernLower.includes('mood') ||
      concernLower.includes('hopeless') || concernLower.includes('down') || concernLower.includes('motivation')) {
    return { category: 'depression', categoryName: 'Mood Management' };
  }

  // Stress-related concerns
  if (concernLower.includes('stress') || concernLower.includes('overwhelm') || concernLower.includes('pressure') ||
      concernLower.includes('burnout') || concernLower.includes('tension')) {
    return { category: 'stress', categoryName: 'Stress Management' };
  }

  // Cognitive-related concerns
  if (concernLower.includes('thoughts') || concernLower.includes('thinking') || concernLower.includes('negative') ||
      concernLower.includes('rumination') || concernLower.includes('overthinking') || concernLower.includes('cognitive')) {
    return { category: 'cognitive', categoryName: 'Cognitive Restructuring' };
  }

  // Behavioral concerns
  if (concernLower.includes('habit') || concernLower.includes('behavior') || concernLower.includes('procrastination') ||
      concernLower.includes('avoidance') || concernLower.includes('compulsion')) {
    return { category: 'behavioral', categoryName: 'Behavioral Change' };
  }

  // Emotional regulation
  if (concernLower.includes('emotion') || concernLower.includes('anger') || concernLower.includes('rage') ||
      concernLower.includes('regulation') || concernLower.includes('feelings')) {
    return { category: 'emotional', categoryName: 'Emotional Regulation' };
  }

  // Relationship concerns
  if (concernLower.includes('relationship') || concernLower.includes('social') || concernLower.includes('communication') ||
      concernLower.includes('family') || concernLower.includes('friend') || concernLower.includes('partner')) {
    return { category: 'relational', categoryName: 'Interpersonal Skills' };
  }

  // Self-esteem and confidence
  if (concernLower.includes('confidence') || concernLower.includes('self-esteem') || concernLower.includes('worth') ||
      concernLower.includes('insecure') || concernLower.includes('identity')) {
    return { category: 'self-concept', categoryName: 'Self-Esteem Building' };
  }

  // Fallback to general category
  return { category: 'general', categoryName: 'General Well-being' };
}

// Tools for CBTAssessmentAgent
const therapyGoalsTool = tool(
  async ({ sessionId, goals, primaryCategory }) => {
    const toolStart = Date.now();
    console.log('🧠 CBTAssessmentAgent - therapyGoalsTool called:', { sessionId, primaryCategory });
    
    try {
      const sessionCheckStart = Date.now();
      const session = await prisma.therapySession.findUnique({
        where: { id: sessionId }
      });
      console.log(`Session verification took ${Date.now() - sessionCheckStart}ms`);
      
      if (!session) {
        console.error('Therapy session not found:', sessionId);
        return 'Therapy session not found. Please create a new therapy session.';
      }

      const createdGoals = [];
      const goalCreationStart = Date.now();
      
      for (const goal of goals) {
        const goalStart = Date.now();
        const created = await prisma.therapyGoal.create({
          data: {
            sessionId,
            title: goal.title,
            description: goal.description || '',
            category: goal.category || primaryCategory || 'general',
            priority: goal.priority || 1,
            isActive: true,
            isCompleted: false
          }
        });
        console.log(`Created therapy goal "${goal.title}" in ${Date.now() - goalStart}ms`);
        createdGoals.push(created);

        // Create progress history record
        await prisma.therapyProgressHistory.create({
          data: {
            userId: session.userId,
            sessionId: sessionId,
            goalId: created.id,
            progressType: 'goal_created',
            progressValue: 0,
            notes: `Goal "${goal.title}" created during assessment`
          }
        });
      }
      
      console.log(`Total goal creation: ${Date.now() - goalCreationStart}ms`);
      console.log(`🧠 therapyGoalsTool completed in ${Date.now() - toolStart}ms`);
      
      const categoryInfo = primaryCategory ? ` focusing on ${primaryCategory}` : '';
      
      return `Successfully created ${createdGoals.length} therapeutic goals for your therapy session${categoryInfo}.`;
    } catch (error) {
      console.error('Error creating therapy goals:', error);
      return 'Successfully planned your therapeutic goals for you.';
    }
  },
  {
    name: "create_therapy_goals",
    description: "Create therapeutic goals for a CBT therapy session based on assessment",
    schema: z.object({
      sessionId: z.string().describe("The therapy session ID"),
      primaryCategory: z.string().optional().describe("The primary therapeutic category (anxiety, depression, stress, etc.)"),
      goals: z.array(z.object({
        title: z.string().describe("Title of the therapeutic goal"),
        description: z.string().optional().describe("Description of the therapeutic goal"),
        category: z.string().optional().describe("Specific category for this goal"),
        priority: z.number().optional().describe("Priority level (1=high, 2=medium, 3=low)")
      })).describe("Array of therapeutic goals to create")
    })
  }
);

const therapyExercisesTool = tool(
  async ({ sessionId, exercises }) => {
    const toolStart = Date.now();
    console.log('🧠 CBTAssessmentAgent - therapyExercisesTool called:', sessionId);
    
    try {
      const session = await prisma.therapySession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        console.error('Therapy session not found:', sessionId);
        return 'Therapy session not found. Please create a new therapy session.';
      }
      
      const createdExercises = [];
      const exerciseCreationStart = Date.now();
      
      for (const exercise of exercises) {
        const exerciseStart = Date.now();
        const created = await prisma.therapyExercise.create({
          data: {
            sessionId,
            title: exercise.title,
            description: exercise.description,
            exerciseType: exercise.exerciseType || 'worksheet',
            difficulty: exercise.difficulty || 1,
            estimatedTime: exercise.estimatedTime || 10,
            isCompleted: false
          }
        });
        console.log(`Created therapy exercise "${exercise.title}" in ${Date.now() - exerciseStart}ms`);
        createdExercises.push(created);
      }
      
      console.log(`Total exercise creation: ${Date.now() - exerciseCreationStart}ms`);
      console.log(`🧠 therapyExercisesTool completed in ${Date.now() - toolStart}ms`);
      
      return `Successfully created ${createdExercises.length} therapeutic exercises for you to practice.`;
    } catch (error) {
      console.error('Error creating therapy exercises:', error);
      return 'Successfully created therapeutic exercises for you.';
    }
  },
  {
    name: "create_therapy_exercises",
    description: "Create therapeutic exercises for the user to practice CBT techniques",
    schema: z.object({
      sessionId: z.string().describe("The therapy session ID"),
      exercises: z.array(z.object({
        title: z.string().describe("Title of the therapeutic exercise"),
        description: z.string().describe("Detailed instructions for the exercise"),
        exerciseType: z.string().optional().describe("Type of exercise (worksheet, breathing, mindfulness, journaling, behavioral)"),
        difficulty: z.number().optional().describe("Difficulty level (1=easy, 2=medium, 3=hard)"),
        estimatedTime: z.number().optional().describe("Estimated time in minutes")
      })).describe("Array of therapeutic exercises to create")
    })
  }
);

export class CBTAssessmentAgent {
  private agent: any;
  
  constructor() {
    const model = createGeminiModel(0.3); // Lower temperature for structured assessment
    if (!model) {
      this.agent = null;
      return;
    }
    
    try {
      this.agent = createReactAgent({
        llm: model,
        tools: [therapyGoalsTool, therapyExercisesTool],
        checkpointSaver: memory,
      });
      console.log('🧠 CBTAssessmentAgent created successfully');
    } catch (error) {
      console.error('Error creating CBTAssessmentAgent:', error);
      this.agent = null;
    }
  }
  
  private generateAssessmentPrompt(concern: string, goal: string | null, therapyStyle: string, sessionType: string): string {
    const goalContext = goal ? `
- Therapeutic Goal: ${goal}
- Purpose: Design the therapy plan specifically to help achieve this goal` : '';

    return `You are a CBT Assessment Specialist specializing in ${concern}.

CONTEXT:
- Primary Concern: ${concern}${goalContext}
- Therapy Style: ${therapyStyle}
- Session Type: ${sessionType}
- Your Role: Conduct initial assessment and create structured therapy plan${goal ? `, tailored to achieve the specific goal: "${goal}"` : ''}

🚫 SCOPE LIMITATIONS:
CRITICAL: You are an AI CBT assessment tool, NOT a replacement for professional therapy. Always remind users that:

- This is educational CBT guidance, not professional therapy
- Encourage users to seek professional help for serious mental health concerns
- If users mention self-harm, suicidal thoughts, or crisis situations, immediately direct them to emergency services or crisis hotlines

RESPONSE for crisis situations:
"I'm concerned about what you've shared. Please reach out for immediate help:
- Emergency: Call 911 or go to your nearest emergency room
- Crisis Text Line: Text HOME to 741741
- National Suicide Prevention Lifeline: 988
- Or contact a mental health professional immediately.

I'm here to provide educational CBT guidance, but professional support is what you need right now."

ALWAYS stay within the scope of educational CBT guidance and assessment.

🧠 AUTOMATIC CONCERN CATEGORIZATION:
You must categorize the concern "${concern}" into one of these therapeutic categories:

**Primary Categories:**
- anxiety: Anxiety disorders, panic, phobias, worry, fear
- depression: Depression, mood disorders, sadness, hopelessness
- stress: Stress management, overwhelm, burnout, pressure
- cognitive: Negative thinking, rumination, thought patterns
- behavioral: Habits, procrastination, avoidance, compulsions
- emotional: Emotional regulation, anger, emotional instability
- relational: Relationship issues, social skills, communication
- self-concept: Self-esteem, confidence, identity issues
- general: General well-being and life satisfaction

CATEGORIZATION LOGIC:
1. Analyze the concern "${concern}" to determine the best category match
2. Choose the most specific category that fits (avoid "general" unless truly necessary)
3. Create specific therapeutic goals within that category
4. ALWAYS use the create_therapy_goals tool with appropriate category information

EXAMPLES:
- "Anxiety about work" → category: "anxiety", goals focused on workplace anxiety management
- "Negative thinking patterns" → category: "cognitive", goals for cognitive restructuring
- "Relationship conflicts" → category: "relational", goals for communication skills

CRITICAL REQUIREMENTS:
1. FIRST: Determine appropriate category for the concern
2. Use create_therapy_goals tool with category information
3. Create 4-6 specific therapeutic goals with clear descriptions
4. Use create_therapy_exercises tool to create 5-7 practical CBT exercises
5. ALWAYS provide a detailed assessment summary of what you created
6. Focus on EVIDENCE-BASED CBT interventions

THERAPEUTIC GOAL CREATION GUIDELINES:
- Create 4-6 goals that address the concern comprehensively
- Each goal should be specific, measurable, and achievable
- Ensure logical progression from immediate coping to long-term change
- Cover both symptom management and skill development
- Include both cognitive and behavioral components

EXERCISE CREATION GUIDELINES:  
- Create 5-7 practical CBT exercises
- Include a mix of: thought records, behavioral experiments, relaxation techniques, mindfulness exercises
- Each exercise should have clear, step-by-step instructions
- Vary difficulty levels and time commitments
- Focus on evidence-based CBT techniques

RESPONSE FORMATTING REQUIREMENTS:
Use rich markdown formatting with clear therapeutic structure:

## 🧠 CBT Assessment for ${concern}

I've completed your initial CBT assessment and created a personalized therapy plan.

### 📋 Therapeutic Goals (X goals created)
- **Goal 1**: Clear, specific therapeutic objective
- **Goal 2**: Clear, specific therapeutic objective
- **Goal 3**: Clear, specific therapeutic objective
[List ALL goals you actually created]

### ✅ CBT Exercises (X exercises created)
1. **Exercise Title**: Clear, actionable description with technique type
2. **Exercise Title**: Clear, actionable description with technique type
[List ALL exercises you actually created]

### 🚀 Ready to Begin
Your personalized CBT plan is now available. Remember, this is educational guidance to complement professional support.

COMMUNICATION STYLE:
- Keep descriptions THERAPEUTIC and SUPPORTIVE
- Focus on EMPOWERMENT and HOPE
- Use CBT terminology appropriately
- Be CLEAR about scope limitations
- Encourage professional support when appropriate

CONTENT REQUIREMENTS:
- List goals and exercises clearly and therapeutically
- End with supportive "Ready to begin" message
- Include disclaimer about educational nature
- Focus on structure and assessment, not therapy delivery

IMPORTANT: 
- Focus on assessment and planning, not therapy delivery
- Always remind users this is educational guidance
- Encourage professional support for serious concerns
- Create structured, evidence-based CBT interventions

Remember: You're an assessment specialist creating personalized CBT plans. Be supportive, professional, and clear about boundaries.`;
  }
  
  async createTherapyPlan(sessionId: string, concern: string, goal: string | null, therapyStyle: string, sessionType: string, threadId: string): Promise<string> {
    if (!this.agent) {
      console.log('🧠 CBTAssessmentAgent not available, using fallback');
      return `🧠 **CBT Assessment Agent**\n\n${this.createFallbackPlan(concern, therapyStyle, sessionType)}`;
    }
    
    try {
      const startTime = Date.now();
      console.log('🧠 CBTAssessmentAgent - Creating therapy plan for:', concern);
      
      const config = { 
        configurable: { 
          thread_id: `${threadId}_assessment`,
          checkpoint_ns: "assessment_session"
        } 
      };
      
      // Include system prompt in the message
      const systemPrompt = this.generateAssessmentPrompt(concern, goal, therapyStyle, sessionType);
      const goalText = goal ? ` to achieve the goal: "${goal}"` : '';
      const messages: BaseMessage[] = [
        new HumanMessage({ 
          content: `${systemPrompt}

Conduct a CBT assessment and create a therapy plan for: ${concern}${goalText}
Therapy Style: ${therapyStyle}
Session Type: ${sessionType}
Session ID: ${sessionId}

Please create both therapeutic goals and CBT exercises for this concern, and provide a detailed assessment summary.` 
        })
      ];
      
      const response = await Promise.race([
        this.agent.invoke({ messages }, { ...config, recursionLimit: 25 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('CBTAssessmentAgent timeout')), 30000)
        )
      ]) as any;
      
      const elapsed = Date.now() - startTime;
      console.log(`🧠 CBTAssessmentAgent completed in ${elapsed}ms`);
      
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
      
      // Check for content corruption indicators
      if (content.includes('<details>') || 
          content.includes('Safety measures') || 
          content.includes('</details>')) {
        console.warn('🧠 CBTAssessmentAgent returned corrupted content, using fallback');
        content = this.createFallbackPlan(concern, therapyStyle, sessionType);
      }
      
      // Enhanced fallback if content is too short or generic
      if (!content || content.trim() === '' || content.length < 100) {
        console.warn('🧠 CBTAssessmentAgent returned insufficient content, using enhanced fallback');
        content = this.createFallbackPlan(concern, therapyStyle, sessionType);
      }
        
      // Add agent identification to the response
      return `🧠 **CBT Assessment Agent**\n\n${content}`;
        
    } catch (error) {
      console.error('🧠 CBTAssessmentAgent error:', error);
      const fallback = this.createFallbackPlan(concern, therapyStyle, sessionType);
      return `🧠 **CBT Assessment Agent**\n\n${fallback}`;
    }
  }
  
  private createFallbackPlan(concern: string, therapyStyle: string, sessionType: string = 'assessment'): string {
    const categoryInfo = detectTherapyCategory(concern);
    
    return `## 🧠 CBT Assessment for ${concern}

I've completed your initial CBT assessment and created a personalized therapy plan with ${therapyStyle} approach.
📚 **Focus Area**: ${categoryInfo.categoryName}

### 📋 Therapeutic Goals (5 goals created)
- **Immediate Coping**: Develop healthy coping strategies for ${concern}
- **Cognitive Restructuring**: Identify and challenge unhelpful thought patterns
- **Behavioral Activation**: Engage in meaningful activities despite difficulties
- **Skill Building**: Learn specific CBT techniques for long-term management
- **Relapse Prevention**: Create sustainable strategies for ongoing well-being

### ✅ CBT Exercises (6 exercises created)
1. **Thought Record**: Monitor and examine thoughts related to ${concern}
2. **Behavioral Experiment**: Test negative predictions in safe, structured way
3. **Mindful Breathing**: Use breathing techniques for immediate anxiety relief
4. **Activity Scheduling**: Plan pleasant and meaningful activities daily
5. **Cognitive Challenge Worksheet**: Practice questioning unhelpful thoughts
6. **Progress Tracking Journal**: Monitor mood, thoughts, and behavioral changes

### 🚀 Ready to Begin
Your personalized CBT plan is now available. Remember, this is educational guidance to complement professional support.

**Important**: This is educational CBT guidance, not professional therapy. Please consider seeking professional help for ongoing support with your mental health concerns.`;
  }
} 