-- AlterTable
ALTER TABLE "learning_sessions" ADD COLUMN     "subjectCategoryId" INTEGER DEFAULT 1,
ADD COLUMN     "subjectName" TEXT;

-- CreateTable
CREATE TABLE "subject_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📚',
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_learning_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "learningSessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_learning_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_categories_name_key" ON "subject_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subject_categories_displayOrder_key" ON "subject_categories"("displayOrder");

-- CreateIndex
CREATE INDEX "concept_learning_history_userId_idx" ON "concept_learning_history"("userId");

-- CreateIndex
CREATE INDEX "concept_learning_history_conceptId_idx" ON "concept_learning_history"("conceptId");

-- CreateIndex
CREATE INDEX "concept_learning_history_userId_conceptId_idx" ON "concept_learning_history"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "concept_learning_history_completedAt_idx" ON "concept_learning_history"("completedAt");

-- CreateIndex
CREATE INDEX "concept_learning_history_lastReviewedAt_idx" ON "concept_learning_history"("lastReviewedAt");

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_subjectCategoryId_fkey" FOREIGN KEY ("subjectCategoryId") REFERENCES "subject_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_learning_history" ADD CONSTRAINT "concept_learning_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_learning_history" ADD CONSTRAINT "concept_learning_history_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_learning_history" ADD CONSTRAINT "concept_learning_history_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
