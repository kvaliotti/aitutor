# Product Requirements Document: AI Upskilling Tutor

## 1. Product Overview

### 1.1 Vision
An intelligent tutoring system integrated into the existing authentication dashboard that provides personalized, practice-driven learning experiences using LangGraph agents powered by Gemini AI.

### 1.2 Core Value Proposition
- **Adaptive Learning**: AI agent analyzes user level and adjusts teaching approach
- **Practice-Focused**: Emphasizes hands-on tasks over passive consumption
- **Progress Tracking**: Visual concept maps and task completion system
- **Personalized**: Customizable teaching styles and resumable learning sessions

---

# REWORK: Dual-Agent Architecture PRD

## 2. Architecture Rework Overview

### 2.1 Current Problem
The single AI agent is experiencing:
- Performance issues (60+ second response times)
- Complexity overload (trying to plan, teach, and track simultaneously)
- Inconsistent responses (sometimes planning, sometimes teaching)
- Debugging difficulties (hard to isolate issues)

### 2.2 Proposed Solution: Dual-Agent System

**Two specialized agents working in sequence:**

1. **LearningPlanAgent**: Creates structured learning plans
2. **TeacherAgent**: Provides educational content and guidance

### 2.3 Benefits
- **Performance**: Faster, focused responses from each agent
- **Reliability**: Single responsibility principle reduces complexity
- **Transparency**: User sees exactly what each agent is doing
- **Maintainability**: Easier to debug and optimize each agent
- **User Experience**: Clear communication about system actions

## 3. Agent Specifications

### 3.1 LearningPlanAgent

**Primary Responsibility**: Create comprehensive learning structures

**Capabilities:**
- Generate concept maps (5-8 concepts) for any topic
- Create practice tasks aligned with concepts
- Structure learning progression logically
- Estimate time requirements for each component

**Tools:**
- `create_concept_map`: Creates hierarchical concept structure
- `create_practice_tasks`: Creates hands-on exercises

**Input:** Topic + User preferences (teaching style, experience level)
**Output:** Structured learning plan with concepts and tasks

**Response Format:**
```
🎯 Learning Plan Created for [Topic]

I've analyzed [Topic] and created a comprehensive learning plan:

📋 Concept Map (8 concepts):
- Fundamentals of [Topic]
- Core Principles
- [Additional concepts...]

✅ Practice Tasks (5 tasks):
- Task 1: [Description]
- Task 2: [Description]
- [Additional tasks...]

⏱️ Estimated Time: [X] hours total
📈 Difficulty: [Beginner/Intermediate/Advanced]

Your learning plan is now available in the sidebar. Ready to start learning?
```

### 3.2 TeacherAgent

**Primary Responsibility**: Provide educational content and guidance

**Capabilities:**
- Explain concepts in detail with examples
- Guide users through learning progression
- Answer questions about the topic
- Provide encouragement and feedback
- Adapt teaching style (Socratic/Step-by-step/Discovery-based)

**Tools:**
- `update_concept_progress`: Mark concepts as completed
- `update_task_progress`: Mark tasks as completed

**Input:** User questions/requests + Current learning context
**Output:** Educational explanations and guidance

**Response Format:**
```
📚 Let me explain [Concept] for you:

[Detailed explanation with examples, analogies, real-world applications]

💡 Key Points:
- Point 1
- Point 2
- Point 3

🎯 Next Steps:
Try the practice task "[Task Name]" to apply what you've learned.

Any questions about [Concept] before we move forward?
```

## 4. User Experience Flow

### 4.1 Session Initiation
1. **User**: "I want to learn about User Research"
2. **System**: Activates LearningPlanAgent
3. **LearningPlanAgent**: Creates concept map + tasks, updates sidebar
4. **System**: Activates TeacherAgent
5. **TeacherAgent**: "Great! I see we have a learning plan ready. Let me start by explaining the first concept: User Research Fundamentals..."

### 4.2 Learning Progression
1. **TeacherAgent**: Explains current concept in detail
2. **User**: Asks questions or indicates readiness
3. **TeacherAgent**: Provides clarification or suggests practice task
4. **User**: Completes task (marks in sidebar)
5. **TeacherAgent**: Acknowledges completion, moves to next concept
6. **Repeat** until all concepts covered

### 4.3 Dynamic Interactions
- **User asks question**: TeacherAgent responds with explanation
- **User completes task**: TeacherAgent acknowledges and guides next steps
- **User wants new topic**: LearningPlanAgent creates new plan
- **User needs clarification**: TeacherAgent provides additional detail

## 5. Technical Implementation

### 5.1 Agent Orchestration

```typescript
// Determine which agent to use
function selectAgent(userMessage: string, sessionContext: SessionContext) {
  // Use LearningPlanAgent if:
  // - No existing concept map
  // - User requests new topic
  // - User asks to "create learning plan"
  
  // Use TeacherAgent for:
  // - All other interactions
  // - Explaining concepts
  // - Answering questions
  // - Guiding through tasks
}

// Sequential agent workflow
async function processUserMessage(message: string, sessionId: string) {
  const context = await getSessionContext(sessionId);
  
  if (needsLearningPlan(message, context)) {
    // Step 1: LearningPlanAgent creates structure
    const planResult = await learningPlanAgent.invoke(message, context);
    
    // Step 2: TeacherAgent begins teaching
    const teachingResult = await teacherAgent.invoke(
      "Start teaching the first concept from the learning plan",
      { ...context, learningPlan: planResult }
    );
    
    return combineResponses(planResult, teachingResult);
  } else {
    // Direct to TeacherAgent
    return await teacherAgent.invoke(message, context);
  }
}
```

### 5.2 Agent Configurations

**LearningPlanAgent:**
- Model: gemini-2.5-flash
- Temperature: 0.3 (more deterministic for structure)
- Tools: [create_concept_map, create_practice_tasks]
- Max tokens: 1000 (concise planning)

**TeacherAgent:**
- Model: gemini-2.5-flash  
- Temperature: 0.7 (more creative for teaching)
- Tools: [update_concept_progress, update_task_progress]
- Max tokens: 2000 (detailed explanations)

### 5.3 Response Combination

When both agents are used:
```
[LearningPlanAgent Response]

---

[TeacherAgent Response]
```

## 6. Success Metrics

### 6.1 Performance Improvements
- **Response Time**: Target <15 seconds (vs current 60+ seconds)
- **Success Rate**: >95% successful responses (vs current ~70%)
- **User Satisfaction**: Clear communication about system actions

### 6.2 Educational Quality
- **Content Depth**: Maintain rich educational explanations
- **Learning Progression**: Logical concept-to-task flow
- **User Engagement**: Higher task completion rates

### 6.3 System Reliability
- **Error Rates**: <5% agent failures
- **Debugging**: Clear separation of responsibilities
- **Maintenance**: Easier updates and optimizations

## 7. Implementation Plan

### 7.1 Phase 1: Agent Separation (Week 1)
- Create separate LearningPlanAgent and TeacherAgent
- Implement agent selection logic
- Test individual agent performance

### 7.2 Phase 2: Integration (Week 2)
- Implement orchestration system
- Create response combination logic
- Test end-to-end workflows

### 7.3 Phase 3: Optimization (Week 3)
- Performance tuning for each agent
- Enhanced error handling
- User experience refinements

---

**This dual-agent architecture provides a more robust, performant, and maintainable solution for the AI tutoring system.**
