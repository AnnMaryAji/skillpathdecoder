CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Roadmap" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "careerGoal" TEXT NOT NULL,
  "targetLevel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Skill" (
  "id" TEXT NOT NULL,
  "roadmapId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "skillName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "prerequisites" TEXT[] NOT NULL,
  "estimatedHours" INTEGER NOT NULL,
  CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSkillProgress" (
  "id" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSkillProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "city" TEXT,
  "region" TEXT,
  "country" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "online" BOOLEAN NOT NULL DEFAULT false,
  "price" DECIMAL(65,30),
  "registrationUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_providerId_key" ON "Event"("providerId");

CREATE TABLE "SavedEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "relevanceText" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

CREATE TABLE "EventPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "city" TEXT,
  "radiusKm" INTEGER NOT NULL DEFAULT 50,
  "onlineEvents" BOOLEAN NOT NULL DEFAULT true,
  "inPersonEvents" BOOLEAN NOT NULL DEFAULT true,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventPreference_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSkillProgress" ADD CONSTRAINT "UserSkillProgress_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedEvent" ADD CONSTRAINT "SavedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedEvent" ADD CONSTRAINT "SavedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
