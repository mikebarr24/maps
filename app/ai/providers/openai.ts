import "server-only";

import { createProviderRegistry } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { AiThinkingLevel } from "../contracts";

const supportedOpenAIModels = ["gpt-5-mini", "gpt-5"] as const;

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .min(1, "OPENAI_API_KEY is required to use the OpenAI provider."),
  ),
});

let openAIProviderRegistry:
  | ReturnType<typeof createProviderRegistry>
  | undefined;

function getOpenAIEnv() {
  const parsed = openAIEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "OPENAI_API_KEY is required to use the OpenAI provider.",
    );
  }

  return parsed.data;
}

function getOpenAIProviderRegistry() {
  if (!openAIProviderRegistry) {
    openAIProviderRegistry = createProviderRegistry({
      openai: createOpenAI({
        apiKey: getOpenAIEnv().OPENAI_API_KEY,
      }),
    });
  }

  return openAIProviderRegistry;
}

function isSupportedOpenAIModel(
  model: string,
): model is (typeof supportedOpenAIModels)[number] {
  return supportedOpenAIModels.includes(
    model as (typeof supportedOpenAIModels)[number],
  );
}

function mapThinkingToOpenAIReasoningEffort(thinking: AiThinkingLevel) {
  return {
    minimal: "minimal",
    low: "low",
    medium: "medium",
    high: "high",
  }[thinking];
}

export function resolveOpenAILanguageModel(model: string) {
  if (!isSupportedOpenAIModel(model)) {
    throw new Error(
      `Unsupported model "${model}" for provider "openai". Supported models: ${supportedOpenAIModels.join(", ")}.`,
    );
  }

  return getOpenAIProviderRegistry().languageModel(`openai:${model}`);
}

export function buildOpenAIProviderOptions(
  thinking: AiThinkingLevel,
  sessionId?: string,
) {
  return {
    openai: {
      reasoningEffort: mapThinkingToOpenAIReasoningEffort(thinking),
      user: sessionId,
    },
  };
}
