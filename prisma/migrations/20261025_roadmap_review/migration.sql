ALTER TABLE "User"
ADD COLUMN "roadmapReviewedAt" TIMESTAMP(3),
ADD COLUMN "roadmapReviewSummary" TEXT,
ADD COLUMN "roadmapReviewSources" JSONB;
