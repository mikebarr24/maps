import "server-only";

import { createProviderRegistry } from "ai";
import { createOpenAI, openai as defaultOpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import { AiThinkingLevel } from "../contracts";
import { OpenAIModel, supportedOpenAIModels } from "./openai-models";

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .min(1, "OPENAI_API_KEY is required to use the OpenAI provider."),
  ),
});

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

let openAIProviderRegistry:
  | ReturnType<typeof createProviderRegistry>
  | undefined;

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

function isSupportedOpenAIModel(model: string): model is OpenAIModel {
  return supportedOpenAIModels.includes(model as OpenAIModel);
}

function mapThinkingToOpenAIReasoningEffort(thinking: AiThinkingLevel) {
  return {
    [AiThinkingLevel.None]: "none",
    [AiThinkingLevel.Minimal]: "minimal",
    [AiThinkingLevel.Low]: "low",
    [AiThinkingLevel.Medium]: "medium",
    [AiThinkingLevel.High]: "high",
  }[thinking];
}

const reasoningEffortSupportedOpenAIModels = new Set<OpenAIModel>([
  OpenAIModel.Gpt5Mini,
  OpenAIModel.Gpt5,
  OpenAIModel.Gpt54Mini,
  OpenAIModel.Gpt54Nano,
]);

function supportsOpenAIReasoningEffort(model: OpenAIModel) {
  return reasoningEffortSupportedOpenAIModels.has(model);
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
  model: string,
  thinking: AiThinkingLevel,
  sessionId?: string,
) {
  if (!isSupportedOpenAIModel(model)) {
    throw new Error(
      `Unsupported model "${model}" for provider "openai". Supported models: ${supportedOpenAIModels.join(", ")}.`,
    );
  }

  return {
    openai: {
      user: sessionId,
      ...(supportsOpenAIReasoningEffort(model)
        ? {
            reasoningEffort: mapThinkingToOpenAIReasoningEffort(thinking),
          }
        : {}),
    },
  };
}

export function createOpenAIWebSearchTool(
  args?: Parameters<typeof defaultOpenAIProvider.tools.webSearch>[0],
) {
  return defaultOpenAIProvider.tools.webSearch(args);
}
