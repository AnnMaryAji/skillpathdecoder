import { createHash } from "node:crypto";
import { z } from "zod";

import type { Skill } from "./roadmap";

const quizQuestionSchema = z.object({
  prompt: z.string().trim().min(10).max(500),
  options: z.array(z.string().trim().min(1).max(200)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(10).max(500),
}).superRefine((question, context) => {
  if (new Set(question.options).size !== question.options.length) {
    context.addIssue({
      code: "custom",
      message: "Answer options must be distinct.",
      path: ["options"],
    });
  }
});

export const generatedQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).length(5),
}).superRefine((quiz, context) => {
  const prompts = quiz.questions.map((question) => question.prompt.toLowerCase());
  if (new Set(prompts).size !== prompts.length) {
    context.addIssue({ code: "custom", message: "Quiz questions must be distinct." });
  }
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

export function fingerprintSkill(skill: Skill) {
  const snapshot = {
    skill_id: skill.skill_id,
    skill_name: skill.skill_name,
    category: skill.category,
    description: skill.description,
    prerequisites: [...skill.prerequisites].sort(),
    estimated_hours: skill.estimated_hours,
    parallel_group_id: skill.parallel_group_id,
  };
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function fingerprintEventSkill(eventId: string, skillId: string) {
  return createHash("sha256").update(`event:${eventId}:skill:${skillId}`).digest("hex");
}

export function fingerprintQuizSkill(skillId: string, roadmap: { skills: Skill[] } | null, eventId?: string) {
  const roadmapSkill = roadmap?.skills.find((skill) => skill.skill_id === skillId);
  if (roadmapSkill) return fingerprintSkill(roadmapSkill);
  return eventId ? fingerprintEventSkill(eventId, skillId) : null;
}

export function parseGeneratedQuiz(value: unknown) {
  return generatedQuizSchema.parse(value);
}

export function parseStoredQuiz(value: unknown) {
  return generatedQuizSchema.parse(Array.isArray(value) ? { questions: value } : value);
}

export function gradeQuiz(quiz: GeneratedQuiz, answers: number[]) {
  const correct = quiz.questions.reduce(
    (total, question, index) => total + Number(answers[index] === question.correctAnswerIndex),
    0,
  );
  return {
    correct,
    total: quiz.questions.length,
    percentage: Math.round((correct / quiz.questions.length) * 100),
  };
}
