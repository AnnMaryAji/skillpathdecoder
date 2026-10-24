import { NextResponse } from "next/server";
import { z } from "zod";

import {
  aiProviderErrorResponse,
  AIProviderConfigurationError,
  getAIConfiguration,
  getAIMissingKeyMessage,
} from "@/lib/ai-provider";
import {
  createRoleBasedRoadmap,
  parseGeneratedRoadmap,
} from "@/lib/roadmap-generator";

const requestSchema = z.object({
  careerGoal: z.string().trim().min(2).max(120),
  targetLevel: z.enum(["Entry", "Mid", "Senior"]).default("Mid"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Provide a career goal between 2 and 120 characters and a valid target level." },
      { status: 400 },
    );
  }

  const { careerGoal, targetLevel } = parsedRequest.data;
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
    return NextResponse.json({
      roadmap: createRoleBasedRoadmap(careerGoal, targetLevel),
      source: "role-based template",
      notice: getAIMissingKeyMessage(ai.provider),
    });
  }

  let completion;
  try {
    completion = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [
        {
          role: "system",
          content: [
            "Create a practical career skill roadmap for the user's exact target role.",
            "Return only a JSON object with a `skills` array. Include 6 to 14 skills ordered from foundations to portfolio readiness.",
            "Each skill must have: skill_id (unique lowercase snake_case string), skill_name, category (Technical, Conceptual, or Practical/Portfolio), description, prerequisites (array of IDs from this same response), estimated_hours (integer), parallel_group_id (string).",
            "Use accurate prerequisites, avoid cycles, include role-specific tools and methods, professional judgment, communication, and a hands-on portfolio project.",
            "Adapt depth to the requested target level. Do not invent credentials or claim guaranteed employment.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ careerGoal, targetLevel }),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2200,
    });
  } catch (error) {
    return aiProviderErrorResponse(error, ai.provider, ai.model, "roadmap");
  }

  const content = completion.choices[0]?.message.content;
  if (!content) {
    console.error(`${ai.provider} roadmap response did not contain JSON content.`);
    return NextResponse.json(
      { error: "The AI service returned an empty roadmap. Please try again." },
      { status: 502 },
    );
  }

  try {
    const result = parseGeneratedRoadmap(
      careerGoal,
      targetLevel,
      JSON.parse(content) as unknown,
    );
    return NextResponse.json({ roadmap: result, source: ai.provider === "gemini" ? "Gemini" : "OpenAI" });
  } catch (error) {
    console.error(`${ai.provider} roadmap response failed validation`, error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "The AI service returned an invalid roadmap. Please try again." },
      { status: 502 },
    );
  }
}
