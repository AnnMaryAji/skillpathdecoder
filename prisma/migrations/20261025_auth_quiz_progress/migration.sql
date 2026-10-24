ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "roadmapData" JSONB;

DROP TABLE "UserSkillProgress";

CREATE TABLE "UserSkillProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "skillFingerprint" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSkillProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSkillProgress_userId_skillId_key"
ON "UserSkillProgress"("userId", "skillId");

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "skillName" TEXT NOT NULL,
  "skillFingerprint" TEXT NOT NULL,
  "eventId" TEXT,
  "questions" JSONB NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizAttempt_userId_skillId_idx" ON "QuizAttempt"("userId", "skillId");

ALTER TABLE "UserSkillProgress"
ADD CONSTRAINT "UserSkillProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt"
ADD CONSTRAINT "QuizAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
