import { z } from "zod";

import { getAIConfiguration } from "./ai-provider";
import { validateDAG, type Roadmap, type Skill } from "./roadmap";
import { generatedSkillSchema } from "./roadmap-generator";

const reviewResponseSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  additions: z.array(generatedSkillSchema).max(3),
});

export type RoadmapReviewSource = {
  title: string;
  url: string;
};

export type RoadmapReview = {
  summary: string;
  additions: Skill[];
  sources: RoadmapReviewSource[];
};

export class RoadmapReviewError extends Error {}

export function mergeRoadmapAdditions(roadmap: Roadmap, additions: Skill[]): Roadmap {
  if (roadmap.skills.length + additions.length > 24) {
    throw new Error("Roadmap updates exceed the maximum supported skill count.");
  }

  const existingIds = new Set(roadmap.skills.map((skill) => skill.skill_id));
  const additionIds = new Set(additions.map((skill) => skill.skill_id));
  if (additionIds.size !== additions.length || additions.some((skill) => existingIds.has(skill.skill_id))) {
    throw new Error("Roadmap updates contain duplicate skill IDs.");
  }

  const allIds = new Set([...existingIds, ...additionIds]);
  if (additions.some((skill) => skill.prerequisites.some((id) => !allIds.has(id)))) {
    throw new Error("Roadmap updates reference an unknown prerequisite.");
  }

  const skills = [...roadmap.skills, ...additions];
  const validation = validateDAG(skills);
  if (!validation.valid) {
    throw new Error(`Roadmap updates have invalid prerequisites: ${validation.issues.join(" ")}`);
  }

  return { ...roadmap, skills };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractGroundedResponse(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.steps)) {
    throw new RoadmapReviewError("Gemini returned an invalid grounded-review response.");
  }

  let searched = false;
  const textBlocks: string[] = [];
  const sources: RoadmapReviewSource[] = [];

  for (const step of value.steps) {
    if (!isRecord(step)) continue;
    if (step.type === "google_search_call") searched = true;
    if (step.type !== "model_output" || !Array.isArray(step.content)) continue;

    for (const block of step.content) {
      if (!isRecord(block) || block.type !== "text") continue;
      if (typeof block.text === "string") textBlocks.push(block.text);
      if (!Array.isArray(block.annotations)) continue;

      for (const annotation of block.annotations) {
        if (!isRecord(annotation) || annotation.type !== "url_citation") continue;
        if (typeof annotation.url !== "string") continue;
        try {
          const sourceUrl = new URL(annotation.url);
          if (sourceUrl.protocol !== "https:") continue;
          const title = typeof annotation.title === "string" && annotation.title.trim()
            ? annotation.title.trim()
            : sourceUrl.hostname;
          if (!sources.some((source) => source.url === sourceUrl.href)) {
            sources.push({ title, url: sourceUrl.href });
          }
        } catch {
          continue;
        }
      }
    }
  }

  if (!searched || sources.length === 0) {
    throw new RoadmapReviewError("Gemini did not provide a web-search-grounded roadmap review.");
  }

  return { text: textBlocks.join("\n").trim(), sources: sources.slice(0, 8) };
}

export async function reviewRoadmapForUpdates(roadmap: Roadmap): Promise<RoadmapReview> {
  const ai = getAIConfiguration();
  if (ai.provider !== "gemini") {
    throw new RoadmapReviewError("Scheduled roadmap reviews currently require AI_PROVIDER=gemini for Google Search grounding.");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!ai.client || !apiKey || /^(replace-with-|your-)/i.test(apiKey)) {
    throw new RoadmapReviewError("Add GEMINI_API_KEY to enable scheduled roadmap reviews.");
  }

  const remainingSlots = Math.max(0, 24 - roadmap.skills.length);
  const prompt = [
    "Review this career-learning roadmap for significant, verifiable changes in the real world during the last 12 months.",
    "Use Google Search, prioritizing official documentation, release notes, standards bodies, or other primary sources.",
    "Look for newly important modules, packages, libraries, platform capabilities, or changed practices relevant to this exact goal and the learner's target level.",
    "Return only a JSON object with `summary` (a concise evidence-based summary) and `additions` (zero to three genuinely useful new skills).",
    "Never rewrite, rename, remove, or duplicate existing skills. Do not add speculative or merely trendy topics.",
    "Each addition must use a unique lowercase snake_case skill_id and the exact generated-skill fields: skill_name, category, description, prerequisites, estimated_hours, parallel_group_id.",
    "Prerequisites must refer to skill IDs in the existing roadmap or other additions. Prefer additions that extend the roadmap's final stages when appropriate.",
    "If search finds no meaningful change, return an empty additions array and say so in summary.",
    `At most ${Math.min(3, remainingSlots)} additions can fit in this roadmap.`,
    `Current date: ${new Date().toISOString().slice(0, 10)}.`,
    `Roadmap: ${JSON.stringify(roadmap)}`,
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: ai.model,
        input: prompt,
        tools: [{ type: "google_search" }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    throw new RoadmapReviewError(
      `Gemini roadmap review request failed: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (!response.ok) {
    console.error("Gemini grounded roadmap review failed", { status: response.status, model: ai.model });
    throw new RoadmapReviewError(`Gemini roadmap review returned HTTP ${response.status}.`);
  }

  let interaction: unknown;
  try {
    interaction = await response.json();
  } catch {
    throw new RoadmapReviewError("Gemini returned invalid JSON for the roadmap review.");
  }

  const grounded = extractGroundedResponse(interaction);
  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(grounded.text);
  } catch {
    throw new RoadmapReviewError("Gemini returned a non-JSON roadmap review.");
  }

  const parsed = reviewResponseSchema.safeParse(parsedResponse);
  if (!parsed.success) {
    throw new RoadmapReviewError("Gemini returned an invalid roadmap update.");
  }
  if (parsed.data.additions.length > Math.min(3, remainingSlots)) {
    throw new RoadmapReviewError("Gemini suggested more roadmap additions than can be safely applied.");
  }
  if (parsed.data.additions.some((skill) => !/^[a-z][a-z0-9_]{1,63}$/.test(skill.skill_id))) {
    throw new RoadmapReviewError("Gemini returned a roadmap skill ID in an unsupported format.");
  }

  return {
    summary: parsed.data.summary,
    additions: parsed.data.additions,
    sources: grounded.sources,
  };
}
