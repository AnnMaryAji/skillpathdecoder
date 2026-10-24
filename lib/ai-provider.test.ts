import { afterEach, describe, expect, it } from "vitest";

import { AIProviderConfigurationError, getAIConfiguration } from "./ai-provider";

const originalEnvironment = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
};

function restoreEnvironmentValue(key: keyof typeof originalEnvironment) {
  const value = originalEnvironment[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const key of Object.keys(originalEnvironment) as (keyof typeof originalEnvironment)[]) {
    restoreEnvironmentValue(key);
  }
});

describe("getAIConfiguration", () => {
  it("defaults to Gemini and reports a missing key without falling back to OpenAI", () => {
    process.env.AI_PROVIDER = "";
    process.env.GEMINI_API_KEY = "replace-with-your-gemini-api-key";
    process.env.OPENAI_API_KEY = "openai-key";
    delete process.env.GEMINI_MODEL;

    const config = getAIConfiguration();

    expect(config.provider).toBe("gemini");
    expect(config.model).toBe("gemini-3.1-flash-lite");
    expect(config.client).toBeNull();
  });

  it("uses Gemini's OpenAI-compatible endpoint when its key is configured", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";

    const config = getAIConfiguration();

    expect(config.provider).toBe("gemini");
    expect(config.client?.baseURL).toBe("https://generativelanguage.googleapis.com/v1beta/openai/");
  });

  it("keeps OpenAI available as an explicit provider", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "openai-test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const config = getAIConfiguration();

    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-test");
    expect(config.client?.baseURL).toBe("https://api.openai.com/v1");
  });

  it("rejects unknown providers instead of silently selecting another service", () => {
    process.env.AI_PROVIDER = "unknown";

    expect(() => getAIConfiguration()).toThrow(AIProviderConfigurationError);
  });
});
