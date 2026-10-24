import { NextResponse } from "next/server";
import { z } from "zod";

import {
  aiProviderErrorResponse,
  AIProviderConfigurationError,
  getAIConfiguration,
  getAIMissingKeyMessage,
} from "@/lib/ai-provider";
import { getCurrentUser } from "@/lib/auth";
import { curatedEvents } from "@/lib/events";
import { fingerprintQuizSkill, fingerprintSkill, generatedQuizSchema } from "@/lib/quiz";
import { savedRoadmapSchema } from "@/lib/roadmap-storage";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  skillId: z.string().trim().min(1).max(80),
  eventId: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to generate and save a skill quiz." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid skill to quiz." }, { status: 400 });
  }

  let skillName: string | undefined;
  let skillDescription: string;
  let skillFingerprint: string;
  if (parsed.data.eventId) {
    const event = curatedEvents.find((candidate) => candidate.id === parsed.data.eventId);
    if (!event || !event.skills.includes(parsed.data.skillId)) {
      return NextResponse.json({ error: "This event does not include the requested skill." }, { status: 400 });
    }
    skillName = parsed.data.skillId.replace(/[_-]+/g, " ");
    skillDescription = `${event.title}: ${event.description}`;
    const roadmap = savedRoadmapSchema.safeParse(user.roadmapData);
    const eventFingerprint = fingerprintQuizSkill(
      parsed.data.skillId,
      roadmap.success ? roadmap.data : null,
      event.id,
    );
    if (!eventFingerprint) {
      return NextResponse.json({ error: "The event quiz skill could not be verified." }, { status: 400 });
    }
    skillFingerprint = eventFingerprint;
  } else {
    const roadmap = savedRoadmapSchema.safeParse(user.roadmapData);
    const skill = roadmap.success
      ? roadmap.data.skills.find((candidate) => candidate.skill_id === parsed.data.skillId)
      : undefined;
    if (!skill) {
      return NextResponse.json({ error: "This skill is not part of your saved roadmap." }, { status: 404 });
    }
    skillName = skill.skill_name;
    skillDescription = skill.description;
    skillFingerprint = fingerprintSkill(skill);
  }

  let ai;
  try {
    ai = getAIConfiguration();
  } catch (error) {
    if (error instanceof AIProviderConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
  if (!ai.client) {
    return NextResponse.json({ error: getAIMissingKeyMessage(ai.provider) }, { status: 503 });
  }

  let completion;
  try {
    completion = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [
        {
          role: "system",
          content: [
            "Create exactly 5 original multiple-choice questions that assess practical understanding of the user's skill.",
            "Return a JSON object with a `questions` array. Each question must have `prompt`, exactly 4 distinct `options`, `correctAnswerIndex` (0-3), and a concise educational `explanation`.",
            "Keep questions unambiguous, independently answerable, and appropriate to the skill. Do not reveal answers outside the JSON fields.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ skill: skillName, context: skillDescription }),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1800,
    });
  } catch (error) {
    return aiProviderErrorResponse(error, ai.provider, ai.model, "skill quiz");
  }

  const content = completion.choices[0]?.message.content;
  if (!content) {
    console.error(`${ai.provider} skill quiz response did not contain JSON content.`);
    return NextResponse.json({ error: "The quiz service returned an empty quiz." }, { status: 502 });
  }

  let quiz;
  try {
    quiz = generatedQuizSchema.parse(JSON.parse(content) as unknown);
  } catch (error) {
    console.error(`${ai.provider} skill quiz response failed validation`, error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The quiz service returned an invalid quiz. Please try again." }, { status: 502 });
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      skillId: parsed.data.skillId,
      skillName,
      skillFingerprint,
      eventId: parsed.data.eventId,
      questions: quiz,
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    skillId: attempt.skillId,
    skillName: attempt.skillName,
    questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })),
  });
}
