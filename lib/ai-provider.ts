import OpenAI from "openai";
import { NextResponse } from "next/server";

export type AIProvider = "gemini" | "openai";

export class AIProviderConfigurationError extends Error {}

export function getAIConfiguration() {
  const configuredProvider = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (configuredProvider !== "gemini" && configuredProvider !== "openai") {
    throw new AIProviderConfigurationError("AI_PROVIDER must be set to gemini or openai.");
  }

  const provider: AIProvider = configuredProvider;
  const model = provider === "gemini"
    ? process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
  const configuredApiKey = provider === "gemini"
    ? process.env.GEMINI_API_KEY
    : process.env.OPENAI_API_KEY;
  const apiKey = configuredApiKey && !/^(replace-with-|your-)/i.test(configuredApiKey.trim())
    ? configuredApiKey.trim()
    : undefined;

  return {
    provider,
    model,
    client: apiKey
      ? new OpenAI({
        apiKey,
        ...(provider === "gemini"
          ? { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }
          : {}),
      })
      : null,
  };
}

export function getAIMissingKeyMessage(provider: AIProvider) {
  return provider === "gemini"
    ? "Add GEMINI_API_KEY from Google AI Studio to enable AI generation."
    : "Add OPENAI_API_KEY to enable AI generation.";
}

export function aiProviderErrorResponse(
  error: unknown,
  provider: AIProvider,
  model: string,
  task: string,
) {
  if (error instanceof OpenAI.APIError) {
    console.error(`${provider} ${task} request failed`, {
      status: error.status,
      code: error.code,
      model,
    });
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: `${provider} rejected the API key or it lacks permission. Check the provider key in the server environment.` },
        { status: 503 },
      );
    }
    if (error.status === 404) {
      return NextResponse.json(
        { error: `The configured ${provider} model was not found. Check ${provider === "gemini" ? "GEMINI_MODEL" : "OPENAI_MODEL"}.` },
        { status: 503 },
      );
    }
    if (error.status === 429) {
      return NextResponse.json(
        { error: `${provider} rate limit or quota reached. Check the provider's usage limits and try again later.` },
        { status: 503 },
      );
    }
  } else {
    console.error(`${provider} ${task} request failed`, error instanceof Error ? error.message : "Unknown error");
  }

  return NextResponse.json(
    { error: `The ${provider} ${task} service is unavailable. Check the server logs and try again.` },
    { status: 502 },
  );
}
