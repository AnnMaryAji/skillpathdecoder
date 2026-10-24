import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { fingerprintSkill } from "@/lib/quiz";
import { savedRoadmapSchema } from "@/lib/roadmap-storage";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to access your saved progress." }, { status: 401 });
  }

  const roadmap = user.roadmapData === null
    ? null
    : savedRoadmapSchema.safeParse(user.roadmapData);
  if (roadmap && !roadmap.success) {
    console.error("Saved account roadmap failed validation", user.id);
    return NextResponse.json({ error: "Your saved roadmap is invalid. Please contact support." }, { status: 500 });
  }

  const skillFingerprints = new Map(
    roadmap?.success
      ? roadmap.data.skills.map((skill) => [skill.skill_id, fingerprintSkill(skill)])
      : [],
  );
  const savedProgressRows = await prisma.userSkillProgress.findMany({
    where: { userId: user.id },
    select: { skillId: true, confidence: true, skillFingerprint: true },
  });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    roadmap: roadmap ? roadmap.data : null,
    skillProgress: Object.fromEntries(savedProgressRows
      .filter((row) => skillFingerprints.has(row.skillId))
      .filter((row) => skillFingerprints.get(row.skillId) === row.skillFingerprint)
      .map((row) => [row.skillId, row.confidence])),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save your roadmap." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("roadmap" in body)) {
    return NextResponse.json({ error: "A valid roadmap is required." }, { status: 400 });
  }
  const roadmap = savedRoadmapSchema.safeParse(body.roadmap);
  if (!roadmap.success) {
    return NextResponse.json({ error: "The submitted roadmap is invalid." }, { status: 400 });
  }

  const currentRoadmap = user.roadmapData === null
    ? null
    : savedRoadmapSchema.safeParse(user.roadmapData);
  const changed = !currentRoadmap?.success
    || JSON.stringify(currentRoadmap.data) !== JSON.stringify(roadmap.data);

  await prisma.$transaction(async (transaction) => {
    if (changed) {
      await transaction.userSkillProgress.deleteMany({ where: { userId: user.id } });
    }
    await transaction.user.update({
      where: { id: user.id },
      data: { roadmapData: roadmap.data },
    });
  });
  return NextResponse.json({ roadmap: roadmap.data });
}
