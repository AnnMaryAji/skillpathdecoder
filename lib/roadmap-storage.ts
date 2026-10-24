import { z } from "zod";

import { validateDAG } from "./roadmap";
import { generatedSkillsSchema } from "./roadmap-generator";

export const ROADMAP_STORAGE_KEY = "skillpathdecoder.roadmap.v1";

export const savedRoadmapSchema = z.object({
  career_goal: z.string().min(2).max(120),
  target_level: z.enum(["Entry", "Mid", "Senior"]),
  skills: generatedSkillsSchema,
}).superRefine((roadmap, context) => {
  const validation = validateDAG(roadmap.skills);
  for (const issue of validation.issues) {
    context.addIssue({ code: "custom", message: issue });
  }
});

export function saveRoadmapToStorage(roadmap: z.infer<typeof savedRoadmapSchema>) {
  localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(roadmap));
}

export function readRoadmapFromStorage(raw = localStorage.getItem(ROADMAP_STORAGE_KEY)) {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Your saved roadmap is unreadable. Generate a new roadmap to continue.");
  }

  const parsed = savedRoadmapSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Your saved roadmap is invalid. Generate a new roadmap to continue.");
  }
  return parsed.data;
}
