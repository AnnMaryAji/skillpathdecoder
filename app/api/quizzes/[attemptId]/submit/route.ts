import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { fingerprintQuizSkill, fingerprintSkill, gradeQuiz, parseStoredQuiz } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";
import { savedRoadmapSchema } from "@/lib/roadmap-storage";

const submissionSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(5),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to submit a quiz." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Answer every question before submitting." }, { status: 400 });
  }

  const { attemptId } = await params;
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });
  }
  if (attempt.completedAt) {
    return NextResponse.json({ error: "This quiz has already been submitted." }, { status: 409 });
  }

  const roadmap = savedRoadmapSchema.safeParse(user.roadmapData);
  const roadmapSkill = roadmap.success
    ? roadmap.data.skills.find((candidate) => candidate.skill_id === attempt.skillId)
    : undefined;
  const currentFingerprint = attempt.eventId
    ? fingerprintQuizSkill(attempt.skillId, roadmap.success ? roadmap.data : null, attempt.eventId)
    : roadmapSkill
      ? fingerprintSkill(roadmapSkill)
      : null;
  if (!currentFingerprint || currentFingerprint !== attempt.skillFingerprint) {
    return NextResponse.json({ error: "The roadmap or event skill changed after this quiz was generated. Generate a new quiz." }, { status: 409 });
  }

  let quiz: ReturnType<typeof parseStoredQuiz>;
  try {
  quiz = parseStoredQuiz(attempt.questions);
  } catch (error) {
  if (error instanceof ZodError) {
    console.error("Stored quiz failed validation", attempt.id);
    return NextResponse.json({ error: "The saved quiz is invalid and cannot be graded." }, { status: 500 });
  }
  throw error;
  }

  const result = gradeQuiz(quiz, parsed.data.answers);
  const progress = await prisma.$transaction(async (transaction) => {
  const completed = await transaction.quizAttempt.updateMany({
    where: { id: attempt.id, userId: user.id, completedAt: null },
    data: { score: result.percentage, completedAt: new Date() },
  });
  if (completed.count !== 1) return null;

  const previous = await transaction.userSkillProgress.findUnique({
    where: { userId_skillId: { userId: user.id, skillId: attempt.skillId } },
    select: { confidence: true, skillFingerprint: true },
  });
  if (previous && previous.skillFingerprint === attempt.skillFingerprint) {
    if (result.percentage > previous.confidence) {
      await transaction.userSkillProgress.update({
        where: { userId_skillId: { userId: user.id, skillId: attempt.skillId } },
        data: { confidence: result.percentage },
      });
    }
    return Math.max(previous.confidence, result.percentage);
  } else {
    if (previous) {
      await transaction.userSkillProgress.update({
        where: { userId_skillId: { userId: user.id, skillId: attempt.skillId } },
        data: { confidence: result.percentage, skillFingerprint: attempt.skillFingerprint },
      });
    } else {
      await transaction.userSkillProgress.create({
        data: {
          userId: user.id,
          skillId: attempt.skillId,
          skillFingerprint: attempt.skillFingerprint,
          confidence: result.percentage,
        },
      });
    }
  }
  return result.percentage;
  });

  if (progress === null) {
  return NextResponse.json({ error: "This quiz has already been submitted." }, { status: 409 });
  }

  return NextResponse.json({
  ...result,
  skillProgress: progress,
  explanations: quiz.questions.map((question) => question.explanation),
  });
}
