# Tasks

## Phase 1: Basic Authentication System ✅ COMPLETED

### 1. Basic Signup ✅
- [x] 1.1. Email and password form
- [x] 1.2. Basic security (hashed password etc)
- [x] 1.3. Redirect to dashboard after signup

### 2. Login ✅
- [x] 2.1. Email and password form
- [x] 2.2. Redirect to dashboard after logging in

### 3. Dashboard ✅
- [x] 3.1. Greet the user by email

### 4. Technical Requirements ✅
- [x] PostgreSQL integration (myuser:mypassword@localhost:5432/upskilling)
- [x] Password hashing with bcryptjs
- [x] JWT token authentication
- [x] HTTP-only cookie storage
- [x] Input validation
- [x] Error handling
- [x] TypeScript implementation
- [x] Tailwind CSS styling

## Implementation Details Completed

### Backend API Routes
- [x] `POST /api/auth/signup` - User registration with password hashing
- [x] `POST /api/auth/login` - User authentication with JWT generation
- [x] `GET /api/auth/me` - Protected user profile endpoint

### Frontend Pages
- [x] `/signup` - User registration form with validation
- [x] `/login` - User login form with validation
- [x] `/dashboard` - Protected dashboard with user greeting
- [x] `/` - Home page with authentication-based redirection

### Security Features
- [x] bcryptjs password hashing (12 salt rounds)
- [x] JWT token generation and verification
- [x] HTTP-only cookie implementation
- [x] Protected route middleware
- [x] Automatic logout functionality

### Database Setup
- [x] Prisma ORM configuration
- [x] User model with proper schema
- [x] Database client generation

## Phase 2: AI Upskilling Tutor 🚧 IN PROGRESS

### 1. Database Infrastructure for AI Tutor ✅ COMPLETED
- [x] 1.1. Create new database schema for learning sessions
- [x] 1.2. Create concepts table for hierarchical concept maps
- [x] 1.3. Create tasks table for practice task tracking
- [x] 1.4. Create chat_messages table for conversation history
- [x] 1.5. Run Prisma migrations for all new tables
- [x] 1.6. Update Prisma schema with new models

### 2. Backend API Development ✅ COMPLETED
- [x] 2.1. Implement `/api/tutor/sessions` endpoints (CRUD operations)
- [x] 2.2. Implement `/api/tutor/chat` endpoint for AI agent communication
- [x] 2.3. Implement `/api/tutor/concepts` endpoints for concept map management
- [x] 2.4. Implement `/api/tutor/tasks` endpoints for task management
- [x] 2.5. Implement `/api/tutor/progress` endpoints for progress tracking
- [x] 2.6. Add authentication middleware to all tutor endpoints

### 3. Frontend Component Development ✅ COMPLETED
- [x] 3.1. Create `TutorLayout.tsx` with 2/3 + 1/3 layout
- [x] 3.2. Create `ChatInterface.tsx` for AI conversation
- [x] 3.3. Create `ConceptMapSidebar.tsx` for concept visualization
- [x] 3.4. Create `TaskTracker.tsx` for task completion tracking
- [x] 3.5. Create `SessionManager.tsx` for session selection/creation
- [x] 3.6. Create `TeachingSettings.tsx` for style preferences

### 4. Single Agent Implementation ⚠️ NEEDS REWORK
- [x] 4.1. Set up LangGraph with `create_react_agent`
- [x] 4.2. Configure Gemini API integration with rate limiting
- [x] 4.3. Create concept map generation tool for agent
- [x] 4.4. Create task creation tool for agent
- [x] 4.5. Create progress update tool for agent
- [x] 4.6. Implement agent context management with conversation memory
- [x] 4.7. Design and implement system prompts with dynamic context
- [x] 4.8. Integrate tutor system into existing dashboard

### 5. Current Issues with Single Agent 🚨 CRITICAL
- [ ] 5.1. Performance issues (60+ second response times)
- [ ] 5.2. Complexity overload (trying to plan, teach, and track simultaneously)
- [ ] 5.3. Inconsistent responses (sometimes planning, sometimes teaching)
- [ ] 5.4. Debugging difficulties (hard to isolate issues)
- [ ] 5.5. Timeout errors and fallback responses

---

## Phase 2B: DUAL-AGENT ARCHITECTURE REWORK 🔄 PRIORITY

### 1. Agent Architecture Design ⏳ IN PROGRESS
- [ ] 1.1. Define LearningPlanAgent specifications and responsibilities
- [ ] 1.2. Define TeacherAgent specifications and responsibilities  
- [ ] 1.3. Design agent selection logic (when to use which agent)
- [ ] 1.4. Design agent orchestration workflow
- [ ] 1.5. Define response combination strategies

### 2. LearningPlanAgent Implementation
- [ ] 2.1. Create dedicated LearningPlanAgent class
- [ ] 2.2. Configure Gemini model for planning (temperature: 0.3)
- [ ] 2.3. Implement focused system prompt for learning plan creation
- [ ] 2.4. Assign tools: [create_concept_map, create_practice_tasks]
- [ ] 2.5. Optimize for concise, structured responses (max 1000 tokens)
- [ ] 2.6. Add performance logging for planning operations
- [ ] 2.7. Test concept map generation for various topics
- [ ] 2.8. Test practice task creation aligned with concepts

### 3. TeacherAgent Implementation
- [ ] 3.1. Create dedicated TeacherAgent class
- [ ] 3.2. Configure Gemini model for teaching (temperature: 0.7)
- [ ] 3.3. Implement focused system prompt for educational content
- [ ] 3.4. Assign tools: [update_concept_progress, update_task_progress]
- [ ] 3.5. Optimize for detailed explanations (max 2000 tokens)
- [ ] 3.6. Add performance logging for teaching operations
- [ ] 3.7. Test concept explanations with examples and analogies
- [ ] 3.8. Test adaptive teaching style implementation

### 4. Agent Orchestration System
- [ ] 4.1. Implement agent selection function (`selectAgent`)
- [ ] 4.2. Create workflow orchestration (`processUserMessage`)
- [ ] 4.3. Implement response combination logic
- [ ] 4.4. Add transition messaging between agents
- [ ] 4.5. Handle error scenarios and fallbacks
- [ ] 4.6. Add comprehensive logging for debugging
- [ ] 4.7. Test sequential agent workflows
- [ ] 4.8. Test agent handoff scenarios

### 5. Chat API Integration
- [ ] 5.1. Update `/api/tutor/chat` to use dual-agent system
- [ ] 5.2. Implement agent selection logic in chat endpoint
- [ ] 5.3. Add response combination and formatting
- [ ] 5.4. Update conversation saving for dual responses
- [ ] 5.5. Add agent identification in chat messages
- [ ] 5.6. Test API performance with new architecture
- [ ] 5.7. Implement proper error handling and timeouts
- [ ] 5.8. Add agent performance metrics

### 6. User Experience Enhancements
- [ ] 6.1. Update chat interface to handle dual-agent responses
- [ ] 6.2. Add visual indicators for different agent actions
- [ ] 6.3. Implement clear separation between planning and teaching
- [ ] 6.4. Add loading states for each agent phase
- [ ] 6.5. Update sidebar to reflect agent-created content
- [ ] 6.6. Test user flow from topic input to learning completion
- [ ] 6.7. Optimize response formatting and readability
- [ ] 6.8. Add agent transparency messages

### 7. Performance Optimization
- [ ] 7.1. Benchmark individual agent response times
- [ ] 7.2. Optimize LearningPlanAgent for speed (<10 seconds)
- [ ] 7.3. Optimize TeacherAgent for educational quality (<15 seconds)
- [ ] 7.4. Implement parallel processing where possible
- [ ] 7.5. Add caching for frequently requested topics
- [ ] 7.6. Monitor and optimize database operations
- [ ] 7.7. Test system under load with multiple concurrent users
- [ ] 7.8. Implement rate limiting per agent

### 8. Testing & Validation
- [ ] 8.1. Unit tests for individual agent functions
- [ ] 8.2. Integration tests for agent orchestration
- [ ] 8.3. End-to-end tests for complete learning workflows
- [ ] 8.4. Performance tests for response time targets
- [ ] 8.5. User acceptance testing for educational quality
- [ ] 8.6. Error handling and edge case testing
- [ ] 8.7. Load testing for system scalability
- [ ] 8.8. A/B testing vs single agent approach

### 9. Migration & Deployment
- [ ] 9.1. Create migration plan from single to dual-agent
- [ ] 9.2. Implement feature flag for dual-agent system
- [ ] 9.3. Gradual rollout strategy
- [ ] 9.4. Monitor system performance post-deployment
- [ ] 9.5. User feedback collection and analysis
- [ ] 9.6. Rollback plan if issues arise
- [ ] 9.7. Documentation update for new architecture
- [ ] 9.8. Team training on dual-agent system

### 10. Success Metrics & Monitoring
- [ ] 10.1. Implement response time monitoring (<15 seconds target)
- [ ] 10.2. Track success rate (>95% target)
- [ ] 10.3. Monitor educational content quality
- [ ] 10.4. Track user engagement and completion rates
- [ ] 10.5. Implement error rate monitoring (<5% target)
- [ ] 10.6. Create performance dashboards
- [ ] 10.7. Set up alerting for system issues
- [ ] 10.8. Regular performance review and optimization

---

## IMPLEMENTATION PRIORITY ORDER

### Week 1: Foundation (Items 1-3)
1. **Agent Architecture Design** - Define specifications and workflows
2. **LearningPlanAgent Implementation** - Create focused planning agent
3. **TeacherAgent Implementation** - Create focused teaching agent

### Week 2: Integration (Items 4-6)  
4. **Agent Orchestration System** - Connect agents together
5. **Chat API Integration** - Update backend to use dual agents
6. **User Experience Enhancements** - Update frontend for new flow

### Week 3: Optimization (Items 7-10)
7. **Performance Optimization** - Meet response time targets
8. **Testing & Validation** - Comprehensive testing suite
9. **Migration & Deployment** - Safe rollout strategy
10. **Success Metrics & Monitoring** - Track and optimize performance

## Next Steps (Future Phases)

### Phase 3: Enhanced Authentication Features
- [ ] Email verification
- [ ] Password reset functionality
- [ ] User profile management
- [ ] Session management improvements
- [ ] Rate limiting
- [ ] CSRF protection

### Phase 4: Advanced Tutor Features
- [ ] Multi-modal learning support (images, videos, documents)
- [ ] Collaborative learning sessions
- [ ] Learning path recommendations
- [ ] Achievement badges and gamification
- [ ] Export progress reports
- [ ] Integration with external learning resources

### Phase 5: UI/UX Improvements
- [ ] Enhanced form validation with real-time feedback
- [ ] Loading states and animations
- [ ] Better error messages
- [ ] Responsive design optimizations
- [ ] Accessibility improvements
- [ ] Dark mode support

