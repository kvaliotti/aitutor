-- AlterTable
ALTER TABLE "learning_sessions" ADD COLUMN     "goal" TEXT;

-- CreateTable
CREATE TABLE "therapy_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "primaryConcern" TEXT NOT NULL,
    "therapyGoal" TEXT,
    "therapyStyle" TEXT NOT NULL DEFAULT 'cognitive-behavioral',
    "sessionType" TEXT NOT NULL DEFAULT 'assessment',
    "status" TEXT NOT NULL DEFAULT 'active',
    "progressLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_goals" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'cognitive',
    "parentGoalId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_exercises" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL DEFAULT 'worksheet',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "estimatedTime" INTEGER NOT NULL DEFAULT 10,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "agentType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_progress_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "goalId" TEXT,
    "progressType" TEXT NOT NULL,
    "progressValue" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_progress_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abcde_exercises" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activatingEvent" TEXT NOT NULL,
    "beliefs" TEXT NOT NULL,
    "consequences" TEXT NOT NULL,
    "disputation" TEXT,
    "effectiveBeliefs" TEXT,
    "completionStatus" TEXT NOT NULL DEFAULT 'in_progress',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abcde_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapy_sessions_threadId_key" ON "therapy_sessions"("threadId");

-- CreateIndex
CREATE INDEX "therapy_progress_history_userId_idx" ON "therapy_progress_history"("userId");

-- CreateIndex
CREATE INDEX "therapy_progress_history_sessionId_idx" ON "therapy_progress_history"("sessionId");

-- CreateIndex
CREATE INDEX "therapy_progress_history_goalId_idx" ON "therapy_progress_history"("goalId");

-- CreateIndex
CREATE INDEX "therapy_progress_history_createdAt_idx" ON "therapy_progress_history"("createdAt");

-- CreateIndex
CREATE INDEX "abcde_exercises_userId_idx" ON "abcde_exercises"("userId");

-- CreateIndex
CREATE INDEX "abcde_exercises_sessionId_idx" ON "abcde_exercises"("sessionId");

-- CreateIndex
CREATE INDEX "abcde_exercises_userId_sessionId_idx" ON "abcde_exercises"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "abcde_exercises_completionStatus_idx" ON "abcde_exercises"("completionStatus");

-- CreateIndex
CREATE INDEX "abcde_exercises_createdAt_idx" ON "abcde_exercises"("createdAt");

-- CreateIndex
CREATE INDEX "abcde_exercises_completedAt_idx" ON "abcde_exercises"("completedAt");

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_goals" ADD CONSTRAINT "therapy_goals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_goals" ADD CONSTRAINT "therapy_goals_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "therapy_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_exercises" ADD CONSTRAINT "therapy_exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_exercises" ADD CONSTRAINT "therapy_exercises_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "therapy_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_chat_messages" ADD CONSTRAINT "therapy_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_progress_history" ADD CONSTRAINT "therapy_progress_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_progress_history" ADD CONSTRAINT "therapy_progress_history_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_progress_history" ADD CONSTRAINT "therapy_progress_history_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "therapy_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abcde_exercises" ADD CONSTRAINT "abcde_exercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abcde_exercises" ADD CONSTRAINT "abcde_exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
