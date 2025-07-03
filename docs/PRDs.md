# Product Requirements Document: AI Upskilling Tutor

## Completed Features Summary

### ✅ Phase 1: Basic Authentication System (COMPLETED)
**Summary**: Full authentication system with signup/login, JWT tokens, protected routes, and PostgreSQL integration. Users can register, login, and access protected dashboard.

### ✅ Phase 2: AI Upskilling Tutor System (COMPLETED)
**Summary**: Complete dual-agent AI tutoring system with LearningPlanAgent (creates concept maps + tasks) and TeacherAgent (provides educational content). Features include session management, concept tracking, task completion, and conversational interface. Supports multiple teaching styles (Socratic, Step-by-step, Discovery-based) and response styles (Concise, Detailed).

**Technical Stack**: Next.js 15, TypeScript, Tailwind CSS, PostgreSQL, Prisma, LangGraph, Google Gemini AI

---

# CURRENT DEVELOPMENT: Personal Concept Library PRD

## 1. Personal Concept Library Overview

### 1.1 Vision
A comprehensive personal knowledge library that organizes all learned and in-progress concepts across topics, serving as both a motivational dashboard and a knowledge reference system.

### 1.2 Core Value Proposition
- **Knowledge Organization**: Three-tier hierarchy (Subject Category → Subject → Concepts)
- **Progress Motivation**: Visual progress tracking with gamification elements
- **Learning History**: Complete record of learning journey with timestamps
- **Quick Access**: Easy navigation back to concepts and learning sessions

## 2. Information Architecture

### 2.1 Three-Tier Hierarchy

**Level 1: Subject Categories (Max 50)**
Predefined categories including:
- Programming
- Data Science & Analytics
- Design & UX
- Business & Management
- Marketing & Sales
- Finance & Economics
- Arts & Creativity
- Sports & Fitness
- Health & Wellness
- Languages
- Science & Technology
- Personal Development
- Other (catch-all)

**Level 2: Subjects**
User-defined topics within categories:
- Example: Programming → "React Hooks", "Python Basics", "Database Design"
- Example: Design & UX → "User Research", "Prototyping", "Design Systems"

**Level 3: Concepts**
Individual learning units created by LearningPlanAgent:
- Example: React Hooks → "useState Hook", "useEffect Hook", "Custom Hooks"

### 2.2 LearningAgent Integration

**Enhanced LearningPlanAgent Output:**
```
Topic Input: "User Research"
Agent Output: {
  subjectCategory: "Design & UX",
  subject: "User Research", 
  concepts: [
    "User Research Fundamentals",
    "Interview Techniques",
    "Survey Design",
    // ... other concepts
  ]
}
```

## 3. User Interface Design

### 3.1 Library Layout & Core Interaction

The Personal Concept Library is a single, responsive page designed for clarity and focus. It replaces a multi-page structure with a streamlined, accordion-style interface.

**Header Dashboard:**
A compact header provides at-a-glance gamification metrics:
- **Learning Level:** Displays the user's current level (e.g., "Beginner," "Advanced") and a progress bar showing their advancement to the next level.
- **Concepts Completed:** Shows the total number of concepts completed against the total number started, with a corresponding completion rate progress bar.

**Category & Concept Accordion:**
- **Dynamic Category List:** The main content area displays a list of subject categories that contain concepts the user has actually started. Empty categories are hidden to reduce clutter.
- **Collapsible Sections:** Each category is a clickable, collapsible accordion header, showing the category icon, name, and a "completed / total" concept count.
- **Direct Concept View:** Expanding a category immediately reveals a list of all concepts within it. This removes the intermediate "Subject" view, providing faster access to content.
- **Visual Completion Status:** Each concept is listed with a visual indicator (e.g., a checkmark in a circle) to clearly show whether it is completed or in progress.

**Navigation:**
- **Entry Points:** Users can access the library from the main navigation.
- **Simplified Flow:** The single-page design eliminates the need for complex breadcrumb navigation. Users can see all their relevant content in one place.

### 3.2 Progress Indicators

**Visual Elements:**
- **Completed Concept:** A colored circle with a checkmark (`✅`).
- **In-Progress Concept:** A neutral-colored, empty circle (`⚪`).

**Progress Bars:**
- **Level Progress:** A bar within the header card shows progress to the next learning level.
- **Overall Completion:** A bar shows the percentage of total concepts completed.

## 4. Motivational Gamification

### 4.1 Statistics & Level System

The core gamification is integrated directly into the header and category list:
- **Primary Metrics:** The header focuses on **Learning Level** and **Overall Completion Rate**. The complex stats dashboard (including streaks, etc.) has been removed in favor of a cleaner design.
- **Level System:** The 6-level system (Beginner to Master) is the primary long-term motivator, with progress clearly visible in the header.

### 4.2 Simplified Achievements
The detailed achievement and badge system has been streamlined. Motivation is now primarily driven by:
- **Leveling up.**
- **Increasing the overall completion percentage.**
- **Completing all concepts within a category.**

This approach provides clear goals without the complexity of managing a separate achievements system.

## 5. Core Interactions

**Concept Exploration:**
- The primary interaction is expanding and collapsing category accordions to view concepts.
- There are no separate pages for concepts; all information is presented on the main library page. Future enhancements could include a modal for concept review.

**Simplified Navigation:**
- The user flow is contained within a single page, making it intuitive and fast to navigate.
- A "Start Learning" call-to-action is prominently displayed if the library is empty.

## 6. Technical Implementation

### 6.1 Database Schema Extensions

**New Tables:**

```sql
-- Subject Categories (predefined)
CREATE TABLE subject_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  display_order INTEGER
);

-- Enhanced Learning Sessions
ALTER TABLE learning_sessions ADD COLUMN subject_category_id INTEGER;
ALTER TABLE learning_sessions ADD COLUMN subject_name VARCHAR(200);

-- Concept Learning History
CREATE TABLE concept_learning_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  concept_id VARCHAR(50) NOT NULL,
  learning_session_id VARCHAR(50) NOT NULL,
  completed_at TIMESTAMP,
  last_reviewed_at TIMESTAMP,
  review_count INTEGER DEFAULT 0
);
```

### 6.2 API Endpoints

The API has been consolidated for efficiency.
- `GET /api/library/overview`: A single, streamlined endpoint now provides all the necessary data for the entire page, including user stats and a nested structure of categories with their associated concepts. The multiple granular endpoints for categories, subjects, and user stats have been removed.

### 6.3 Enhanced LearningPlanAgent

**Updated Tool Schema:**
```typescript
const enhancedConceptMapTool = tool(
  async ({ sessionId, subjectCategory, subject, concepts }) => {
    // Create concepts with category/subject association
    // Update learning session with category metadata
    // Return structured hierarchy for library organization
  },
  {
    schema: z.object({
      sessionId: z.string(),
      subjectCategory: z.string(),
      subject: z.string(), 
      concepts: z.array(/* concept schema */)
    })
  }
);
```

## 7. Success Metrics

### 7.1 Engagement Metrics
- **Library Visit Frequency**: Daily/weekly active users in library
- **Concept Review Rate**: How often users review completed concepts
- **Cross-Subject Learning**: Users learning concepts across multiple categories

### 7.2 Learning Effectiveness  
- **Concept Retention**: Time between initial learning and review
- **Learning Progression**: Linear vs. jumping between subjects
- **Subject Completion Rate**: Percentage of started subjects completed

### 7.3 Motivational Impact
- **Streak Maintenance**: Average learning streak length
- **Level Progression**: Time to advance between levels
- **Achievement Unlock Rate**: Badge earning frequency

## 8. Implementation Roadmap

### 8.1 Phase 1: Foundation (Week 1-2)
- Database schema updates
- Subject category system setup
- Basic library page with category/subject view

### 8.2 Phase 2: Core Features (Week 3-4)
- Concept detail views and interactions
- Progress tracking and statistics
- LearningPlanAgent integration for categorization

### 8.3 Phase 3: Gamification (Week 5-6)
- Level system and achievement badges
- Milestone celebrations and notifications
- Learning streak tracking

### 8.4 Phase 4: Polish (Week 7-8)
- UI/UX refinements
- Performance optimization
- Analytics and metrics implementation

---

# MINI-PRD: Spaced Repetition System

## 9. Spaced Repetition for Concept Reinforcement

### 9.1 Overview
Implement a spaced repetition system to improve long-term concept retention by scheduling automatic review prompts based on forgetting curves.

### 9.2 Core Mechanics

**Review Schedule:**
- First review: 1 day after initial learning
- Second review: 3 days after first review
- Third review: 7 days after second review  
- Fourth review: 14 days after third review
- Maintenance: 30 days, then 90 days

**User Experience:**
- Daily "Review Queue" with 3-5 concepts due for review
- Quick 30-second review format: concept name + key points
- "Remember/Forgot" buttons to adjust future scheduling
- Optional deeper review linking back to original explanation

### 9.3 Implementation
- Background job system for scheduling reviews
- Email/push notification reminders
- Analytics on retention rates per concept/subject
- Integration with existing library system

---

# MINI-PRD: Cross-Session Intelligence

## 10. Intelligent Concept Relationship Detection

### 10.1 Overview
Automatically detect and surface relationships between concepts learned across different sessions, subjects, and categories.

### 10.2 Core Features

**Concept Similarity Detection:**
- NLP analysis of concept names and descriptions
- Automatic grouping of duplicate/similar concepts
- User confirmation before merging duplicates

**Prerequisite Relationship Mapping:**
- AI analysis of concept dependencies
- Visual representation of learning pathways
- Suggested learning order optimization

**Recommendation Engine:**
- "Since you learned X, you might like Y" suggestions
- Cross-pollination between subjects (e.g., "Statistics" relevant to both Data Science and Psychology)
- Identify knowledge gaps in related areas

### 10.3 Implementation
- Vector embeddings for concept similarity
- Graph database for relationship mapping
- Machine learning model for recommendation generation
- User feedback loop for improving suggestions

---

**The Personal Concept Library transforms the tutoring system from a session-based tool into a comprehensive knowledge management platform, driving long-term engagement through gamification and intelligent organization.**

---

# Phase 5: Advanced CBT - Cognitive Restructuring Agent PRD

## 1. Cognitive Restructuring Agent Overview

### 1.1 Vision
Enhance the CBT therapy system with a specialized Cognitive Restructuring Agent that guides users through the evidence-based ABCDE framework (Activating Event, Beliefs, Consequences, Disputation, Effective New Beliefs) for systematic cognitive restructuring.

### 1.2 Core Value Proposition
- **Specialized CBT Technique**: Dedicated agent for the most fundamental CBT intervention
- **Structured Guidance**: Step-by-step progression through ABCDE framework
- **Interactive Probing**: Dynamic questioning to extract complete information for each element
- **Progress Documentation**: Permanent record of cognitive restructuring exercises
- **Seamless Integration**: Smooth handoff between main therapy agent and specialized agent

## 2. Agent Architecture Enhancement

### 2.1 Three-Agent CBT System

**Existing Agents:**
- **CBTAssessmentAgent**: Initial therapy plan creation (goals + exercises)
- **CBTPsychotherapistAgent**: Main ongoing therapy guidance and support

**New Agent:**
- **CognitiveRestructuringAgent**: Specialized ABCDE framework facilitation

### 2.2 Agent Transfer Protocol

**Transfer Triggers (CBTPsychotherapistAgent → CognitiveRestructuringAgent):**
- User mentions specific problematic thoughts or situations
- User requests cognitive restructuring help
- Agent identifies opportunity for thought challenging
- User explicitly asks to work through negative thinking patterns

**Transfer Process:**
1. **CBTPsychotherapistAgent** identifies cognitive restructuring opportunity
2. Agent explains ABCDE framework briefly and asks for consent
3. Control transfers to **CognitiveRestructuringAgent** with context
4. **CognitiveRestructuringAgent** guides user through complete ABCDE exercise
5. Agent creates ABCDE record using specialized tool
6. Control returns to **CBTPsychotherapistAgent** with completed exercise context

**Return Triggers (CognitiveRestructuringAgent → CBTPsychotherapistAgent):**
- ABCDE exercise completed successfully
- User requests to stop/abort exercise
- Agent determines user needs different support approach

## 3. ABCDE Framework Implementation

### 3.1 Framework Structure

**A - Activating Event:**
- Specific situation or trigger that caused distress
- Probing questions: "What exactly happened? When? Where? Who was involved?"
- Goal: Concrete, factual description without interpretation

**B - Beliefs:**
- Automatic thoughts and core beliefs triggered by the event
- Probing questions: "What went through your mind? What did you tell yourself?"
- Goal: Identify both surface thoughts and underlying belief patterns

**C - Consequences:**
- Emotional and behavioral responses to the beliefs
- Probing questions: "How did you feel? What did you do? What physical sensations?"
- Goal: Connect beliefs to emotional/behavioral outcomes

**D - Disputation:**
- Challenge and examine the validity of the beliefs
- Probing questions: "Is this thought helpful? What evidence supports/contradicts it?"
- Goal: Develop alternative, more balanced perspectives

**E - Effective New Beliefs:**
- Replacement thoughts and beliefs that are more rational and helpful
- Probing questions: "What would be a more balanced way to think about this?"
- Goal: Create sustainable, positive cognitive alternatives

### 3.2 Dynamic Conversation Flow

**Intelligent Progression Logic:**
- Agent determines when user has provided sufficient detail for current element
- Decides whether to probe deeper or move to next element
- Adapts questioning style based on user responses
- Recognizes when user is struggling and provides additional support

**Conversation Examples:**

```
Agent: "Let's start with A - the Activating Event. Can you describe the specific situation that triggered these difficult feelings?"

User: "My boss criticized my presentation."

Agent: "I can see that was difficult. Let me get a clearer picture - when did this happen, and what exactly did your boss say? The more specific details we can capture, the better we can work with this."

User: "Yesterday after the team meeting. He said my slides were confusing and that I need to be more organized."

Agent: "Thank you for those details. Now let's move to B - your Beliefs. What thoughts went through your mind when you heard that feedback?"
```

## 4. ABCDE Exercise Tool & Data Management

### 4.1 Database Schema Extensions

**New Table: ABCDE Exercises**
```sql
CREATE TABLE abcde_exercises (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  therapy_session_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  activating_event TEXT NOT NULL,
  beliefs TEXT NOT NULL,
  consequences TEXT NOT NULL,
  disputation TEXT,
  effective_beliefs TEXT,
  completion_status ENUM('in_progress', 'completed', 'abandoned'),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (therapy_session_id) REFERENCES therapy_sessions(id)
);
```

### 4.2 ABCDE Exercise Tool

**Tool Functionality:**
```typescript
const abcdeExerciseTool = tool(
  async ({ 
    sessionId, 
    title, 
    activatingEvent, 
    beliefs, 
    consequences, 
    disputation, 
    effectiveBeliefs 
  }) => {
    // Create ABCDE exercise record
    // Update therapy session progress
    // Return confirmation message
  },
  {
    name: "create_abcde_exercise",
    description: "Create a completed ABCDE cognitive restructuring exercise record",
    schema: z.object({
      sessionId: z.string(),
      title: z.string().describe("Short descriptive title summarizing the exercise"),
      activatingEvent: z.string().describe("The triggering situation (A)"),
      beliefs: z.string().describe("Automatic thoughts and beliefs (B)"),  
      consequences: z.string().describe("Emotional and behavioral responses (C)"),
      disputation: z.string().describe("Challenges to the beliefs (D)"),
      effectiveBeliefs: z.string().describe("New, more balanced beliefs (E)")
    })
  }
);
```

## 5. User Interface Enhancements

### 5.1 Sidebar Integration

**New ABCDE Section in Therapy Sidebar:**
- **Header**: "🧠 Cognitive Restructuring"
- **Exercise Count**: "X ABCDE exercises completed"
- **Recent Exercises**: List of 3 most recent exercises with titles
- **View All Link**: "View all exercises →"

**ABCDE Exercise Display:**
```
🧠 Cognitive Restructuring (3 completed)

Recent Exercises:
• Presentation Feedback Anxiety (2 days ago)
• Job Interview Worry (1 week ago) 
• Social Rejection Fear (2 weeks ago)

[View all exercises →]
```

### 5.2 Dedicated ABCDE Page

**Route**: `/therapy/abcde`

**Page Structure:**
- **Header**: Statistics and overview (total exercises, completion rate, recent activity)
- **Exercise List**: Chronological list of all completed ABCDE exercises
- **Exercise Cards**: Expandable cards showing full ABCDE breakdown
- **Search/Filter**: Find exercises by title, date, or keywords

**Exercise Card Design:**
```
[📅 Date] Presentation Feedback Anxiety
A: Boss criticized my slides after team meeting
B: "I'm terrible at presentations, everyone thinks I'm incompetent"
C: Felt anxious, avoided eye contact, stayed late to redo slides
D: Is one piece of feedback evidence I'm incompetent? What about positive feedback?
E: "Feedback helps me improve. One critique doesn't define my abilities."

[Tags: Work, Perfectionism, Feedback] [Edit] [Share with Therapist]
```

## 6. Technical Implementation

### 6.1 Agent Orchestration Updates

**Enhanced CBT Orchestration System:**
```typescript
// New orchestration logic
function needsCognitiveRestructuring(userMessage: string, context: any): boolean {
  // Detect when to transfer to CognitiveRestructuringAgent
  // Based on keywords, context, and conversation flow
}

async function processCBTMessage(sessionId, userId, message, threadId) {
  if (needsCognitiveRestructuring(message, context)) {
    // Transfer to CognitiveRestructuringAgent
    return await cognitiveRestructuringAgent.facilitateABCDE(sessionId, message, context, threadId);
  } else {
    // Continue with main CBTPsychotherapistAgent
    return await cbtPsychotherapistAgent.provideCare(sessionId, message, context, threadId);
  }
}
```

### 6.2 API Endpoints

**New ABCDE Management Endpoints:**
- `GET /api/therapy/abcde` - Retrieve user's ABCDE exercises
- `POST /api/therapy/abcde` - Create new ABCDE exercise (called by agent tool)
- `GET /api/therapy/abcde/[id]` - Get specific ABCDE exercise details
- `PUT /api/therapy/abcde/[id]` - Update ABCDE exercise (for edits)

### 6.3 Agent Context Management

**Seamless Context Transfer:**
- CognitiveRestructuringAgent receives full therapy session context
- ABCDE exercise progress tracked in agent state
- Completed exercise context passed back to CBTPsychotherapistAgent
- Conversation history maintains continuity across agent transfers

## 7. Success Metrics

### 7.1 Engagement Metrics
- **ABCDE Exercise Completion Rate**: Percentage of started exercises completed
- **Exercise Frequency**: Average exercises completed per therapy session
- **Depth of Engagement**: Average conversation turns per ABCDE exercise

### 7.2 Therapeutic Effectiveness
- **Cognitive Pattern Recognition**: Users identifying recurring thought patterns
- **Skill Transfer**: Application of ABCDE framework independently
- **Emotional Regulation**: Self-reported mood improvements after exercises

### 7.3 Technical Performance
- **Agent Transfer Success Rate**: Smooth handoffs without conversation breaks
- **Exercise Data Quality**: Completeness and depth of ABCDE records
- **User Experience**: Feedback on specialized agent interaction

## 8. Implementation Roadmap

### 8.1 Phase 1: Core Agent Development (Week 1-2)
- CognitiveRestructuringAgent implementation
- ABCDE framework conversation logic
- Dynamic probing and progression algorithms
- Agent transfer protocols

### 8.2 Phase 2: Data & Tools (Week 2-3)
- Database schema updates
- ABCDE exercise tool implementation
- API endpoints for exercise management
- Data validation and storage

### 8.3 Phase 3: UI Integration (Week 3-4)
- Sidebar ABCDE section
- Dedicated ABCDE exercises page
- Exercise card design and interactions
- Navigation integration

### 8.4 Phase 4: Testing & Optimization (Week 4-5)
- Agent transfer flow testing
- ABCDE exercise completion testing
- User experience optimization
- Performance monitoring and analytics

---

**The Cognitive Restructuring Agent represents a significant advancement in the CBT system's therapeutic capabilities, providing users with structured, evidence-based cognitive restructuring through the proven ABCDE framework while maintaining seamless integration with the existing therapy system.**
