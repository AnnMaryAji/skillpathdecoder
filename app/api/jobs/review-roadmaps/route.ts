import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mergeRoadmapAdditions, reviewRoadmapForUpdates } from "@/lib/roadmap-review";
import { savedRoadmapSchema } from "@/lib/roadmap-storage";

const reviewIntervalMs = 7 * 24 * 60 * 60 * 1000;
const reviewBatchSize = 3;

function isAuthorized(request: Request) {
  const secret = process.env.ROADMAP_REVIEW_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const providedSecret = request.headers.get("x-roadmap-review-secret") ?? bearerSecret;
  return providedSecret === secret;
}

async function reviewDueRoadmaps(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Configure ROADMAP_REVIEW_SECRET or CRON_SECRET." },
      { status: 401 },
    );
  }

  const cutoff = new Date(Date.now() - reviewIntervalMs);
  const users = await prisma.user.findMany({
    where: {
      roadmapData: { not: Prisma.DbNull },
      OR: [
        { roadmapReviewedAt: null },
        { roadmapReviewedAt: { lt: cutoff } },
      ],
    },
    select: {
      id: true,
      roadmapData: true,
      roadmapReviewedAt: true,
    },
    orderBy: [
      { roadmapReviewedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
    ],
    take: reviewBatchSize,
  });

  let reviewed = 0;
  let updated = 0;
  const failures: string[] = [];

  for (const user of users) {
    const roadmap = savedRoadmapSchema.safeParse(user.roadmapData);
    if (!roadmap.success) {
      console.error("Scheduled roadmap review skipped an invalid saved roadmap", user.id);
      failures.push(`${user.id}: saved roadmap is invalid`);
      continue;
    }

    try {
      const review = await reviewRoadmapForUpdates(roadmap.data);
      const updatedRoadmap = review.additions.length
        ? mergeRoadmapAdditions(roadmap.data, review.additions)
        : roadmap.data;
      const result = await prisma.user.updateMany({
        where: { id: user.id, roadmapReviewedAt: user.roadmapReviewedAt },
        data: {
          roadmapData: updatedRoadmap,
          roadmapReviewedAt: new Date(),
          roadmapReviewSummary: review.summary,
          roadmapReviewSources: review.sources,
        },
      });

      if (result.count === 0) {
        console.info("Skipped a roadmap review because the user updated their roadmap concurrently", user.id);
        continue;
      }

      reviewed += 1;
      updated += review.additions.length;
    } catch (error) {
      console.error("Scheduled roadmap review failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      failures.push(`${user.id}: review failed`);
    }
  }

  const result = {
    ok: failures.length === 0,
    reviewed,
    skillsAdded: updated,
    failures,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(result, { status: failures.length ? 502 : 200 });
}

export async function GET(request: Request) {
  return reviewDueRoadmaps(request);
}

export async function POST(request: Request) {
  return reviewDueRoadmaps(request);
}
