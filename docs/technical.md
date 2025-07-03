# Technical Specifications

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **State Management**: React hooks and context

### Backend
- **Framework**: Next.js API Routes
- **Language**: TypeScript
- **Authentication**: JWT tokens with HTTP-only cookies
- **Password Hashing**: bcryptjs with salt rounds 12
- **AI Integration**: LangGraph with Google Gemini AI

### Database
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Connection**: Direct connection via DATABASE_URL

### AI Agent System
- **Framework**: LangGraph for agent orchestration
- **AI Model**: Google Gemini 1.5 Pro
- **Agent Architecture**: Dual-agent systems (Learning + CBT)
- **Response Time**: <25 seconds average

## Architecture Patterns

### Authentication Flow
1. **Registration**: Email/password → Hash password → Store user → Generate JWT → Set cookie
2. **Login**: Email/password → Verify credentials → Generate JWT → Set cookie
3. **Authorization**: Extract JWT from cookie → Verify token → Fetch user data

### Dual-Agent System Architecture
**Learning System:**
- **LearningPlanAgent**: Creates structured learning plans (concept maps + tasks)
- **TeacherAgent**: Provides educational content and guidance
- **TutorOrchestration**: Coordinates agent interactions and context management

**CBT Therapy System:**
- **CBTAssessmentAgent**: Creates therapeutic structure (goals + exercises)
- **CBTPsychotherapistAgent**: Provides ongoing therapeutic guidance
- **CBTOrchestration**: Coordinates therapy agent interactions and context management

### Security Features
- Password hashing with bcryptjs (12 salt rounds)
- JWT tokens with 7-day expiration
- HTTP-only cookies for token storage
- Input validation on all endpoints
- Secure cookie settings (httpOnly, sameSite: strict)
- Crisis intervention protocols in CBT system

## Database Schema

### Core Tables
```prisma
model User {
  id                       String                    @id @default(cuid())
  email                    String                    @unique
  password                 String
  createdAt                DateTime                  @default(now())
  updatedAt                DateTime                  @updatedAt
  
  // Learning System Relationships
  learningSessions         LearningSession[]
  concepts                 Concept[]
  tasks                    Task[]
  chatMessages             ChatMessage[]
  conceptLearningHistory   ConceptLearningHistory[]
  
  // CBT Therapy System Relationships
  therapySessions          TherapySession[]
  therapyGoals             TherapyGoal[]
  therapyExercises         TherapyExercise[]
  therapyChatMessages      TherapyChatMessage[]
  therapyProgressHistory   TherapyProgressHistory[]
  
  @@map("users")
}
```

### Learning System Tables
```prisma
model LearningSession {
  id                String               @id @default(cuid())
  userId            String
  topic             String
  goal              String?
  subjectCategoryId String?
  subjectName       String?
  sessionType       SessionType          @default(LEARNING)
  status            SessionStatus        @default(ACTIVE)
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  user              User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  subjectCategory   SubjectCategory?     @relation(fields: [subjectCategoryId], references: [id])
  concepts          Concept[]
  tasks             Task[]
  chatMessages      ChatMessage[]
  
  @@map("learning_sessions")
}

model Concept {
  id                     String                   @id @default(cuid())
  sessionId              String
  userId                 String
  title                  String
  description            String
  completed              Boolean                  @default(false)
  completedAt            DateTime?
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  
  session                LearningSession          @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user                   User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conceptLearningHistory ConceptLearningHistory[]
  
  @@map("concepts")
}

model SubjectCategory {
  id               String            @id @default(cuid())
  name             String            @unique
  description      String?
  icon             String?
  displayOrder     Int               @default(0)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  learningSessions LearningSession[]
  
  @@map("subject_categories")
}
```

### CBT Therapy System Tables
```prisma
model TherapySession {
  id                     String                   @id @default(cuid())
  userId                 String
  concern                String
  goal                   String?
  therapyStyle           TherapyStyle             @default(CBT)
  sessionType            TherapySessionType       @default(ASSESSMENT)
  status                 SessionStatus            @default(ACTIVE)
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  
  user                   User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  therapyGoals           TherapyGoal[]
  therapyExercises       TherapyExercise[]
  therapyChatMessages    TherapyChatMessage[]
  therapyProgressHistory TherapyProgressHistory[]
  
  @@map("therapy_sessions")
}

model TherapyGoal {
  id              String                   @id @default(cuid())
  sessionId       String
  userId          String
  title           String
  description     String
  category        TherapyConcernCategory
  completed       Boolean                  @default(false)
  completedAt     DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  
  session         TherapySession           @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  progressHistory TherapyProgressHistory[]
  
  @@map("therapy_goals")
}

model TherapyExercise {
  id              String                   @id @default(cuid())
  sessionId       String
  userId          String
  title           String
  description     String
  instructions    String
  category        TherapyConcernCategory
  completed       Boolean                  @default(false)
  completedAt     DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  
  session         TherapySession           @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  progressHistory TherapyProgressHistory[]
  
  @@map("therapy_exercises")
}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user profile

### Learning System
- `GET /api/sessions` - Get user's learning sessions
- `POST /api/sessions` - Create new learning session
- `GET /api/chat` - Get session chat messages
- `POST /api/chat` - Send message to AI agents
- `GET /api/concepts` - Get session concepts
- `PUT /api/concepts` - Update concept completion
- `GET /api/tasks` - Get session tasks
- `PUT /api/tasks` - Update task completion
- `GET /api/progress` - Get learning progress

### Personal Library
- `GET /api/library/overview` - Get library overview with stats
- `GET /api/library/categories` - Get subject categories
- `GET /api/library/stats` - Get user statistics and achievements

### CBT Therapy System
- `GET /api/therapy/sessions` - Get user's therapy sessions
- `POST /api/therapy/sessions` - Create new therapy session
- `GET /api/therapy/chat` - Get therapy chat messages
- `POST /api/therapy/chat` - Send message to CBT agents
- `GET /api/therapy/goals` - Get therapy goals
- `PUT /api/therapy/goals` - Update goal progress
- `GET /api/therapy/exercises` - Get therapy exercises
- `PUT /api/therapy/exercises` - Update exercise completion

## Frontend Routes

### Core Pages
- `/` - Home page (auto-redirects based on auth status)
- `/signup` - User registration form
- `/login` - User login form
- `/dashboard` - Protected dashboard with navigation

### Learning System
- `/tutor` - AI tutoring interface with dual-agent system
- `/library` - Personal concept library with gamification

### CBT Therapy System
- `/therapy` - CBT psychotherapist interface with dual-agent system

## Key Features

### Learning System Features
- Dual-agent AI tutoring (LearningPlanAgent + TeacherAgent)
- Automatic subject categorization (92% accuracy)
- Progress tracking with concept completion
- Gamification system (6 levels, 27 achievement badges)
- Personal concept library with 50 predefined categories
- Multiple teaching styles and response formats

### CBT Therapy Features
- Dual-agent CBT therapy (CBTAssessmentAgent + CBTPsychotherapistAgent)
- Automatic therapeutic concern categorization
- Crisis intervention protocols
- Therapy goal and exercise tracking
- Progress monitoring and session management
- Professional therapy disclaimers and scope limitations

### System Performance
- <25 second AI response times
- Optimized chat interface with virtual scrolling
- Real-time progress updates
- Responsive design across devices
- Comprehensive error handling and fallbacks

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - Application base URL
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini AI API key

## File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   └── me/route.ts
│   │   ├── sessions/route.ts
│   │   ├── chat/route.ts
│   │   ├── concepts/route.ts
│   │   ├── tasks/route.ts
│   │   ├── library/
│   │   │   ├── overview/route.ts
│   │   │   └── stats/route.ts
│   │   └── therapy/
│   │       ├── sessions/route.ts
│   │       ├── chat/route.ts
│   │       ├── goals/route.ts
│   │       └── exercises/route.ts
│   ├── dashboard/page.tsx
│   ├── tutor/page.tsx
│   ├── library/page.tsx
│   ├── therapy/page.tsx
│   └── page.tsx
├── components/
│   ├── tutor/
│   │   ├── TutorLayout.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ConceptMapSidebar.tsx
│   │   └── TaskTracker.tsx
│   ├── library/
│   │   ├── LibraryStats.tsx
│   │   ├── CategoryGrid.tsx
│   │   └── AchievementBadges.tsx
│   ├── therapy/
│   │   └── CBTChatInterface.tsx
│   └── AuthForm.tsx
├── lib/
│   ├── agents/
│   │   ├── learning.agent.ts
│   │   ├── teacher.agent.ts
│   │   ├── tutor-orchestration.ts
│   │   ├── cbt-assessment.agent.ts
│   │   ├── cbt-psychotherapist.agent.ts
│   │   └── cbt-orchestration.ts
│   ├── prisma.ts
│   └── auth.ts
└── types/
    ├── learning.types.ts
    └── therapy.types.ts
```

