import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph';

// Environment variable validation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
}

// Create Gemini model instances
export function createGeminiModel(temperature: number = 0.7) {
  if (!GEMINI_API_KEY) {
    console.error('Cannot create Gemini model: API key missing');
    return null;
  }

  try {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey: GEMINI_API_KEY,
      temperature,
    });
  } catch (error) {
    console.error('Error creating Gemini model:', error);
    return null;
  }
}

// Simple fallback response function
export async function createSimpleResponse(userMessage: string, context: any): Promise<string> {
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

// Memory for conversation persistence
export const memory = new MemorySaver(); 