import type { ToolSet } from "ai";
import { z } from "zod";

export enum AiProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export const aiProviders = [AiProvider.OpenAI, AiProvider.Anthropic] as const;

export enum AiThinkingLevel {
  None = "none",
  Minimal = "minimal",
  Low = "low",
  Medium = "medium",
  High = "high",
}

export const aiThinkingLevels = Object.values(AiThinkingLevel) as [
  AiThinkingLevel,
  ...AiThinkingLevel[],
];

function isAiSdkTool(value: unknown): value is ToolSet[string] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const tool = value as {
    execute?: unknown;
    id?: unknown;
    inputSchema?: unknown;
    type?: unknown;
  };

  if (!("inputSchema" in tool)) {
    return false;
  }

  return (
    typeof tool.execute === "function" ||
    (tool.type === "provider" && typeof tool.id === "string")
  );
}

function isToolSet(value: unknown): value is ToolSet {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isAiSdkTool);
}

export type AiRequestConfig = {
  provider: AiProvider;
  model: string;
  thinking: AiThinkingLevel;
  maxOutputTokens?: number;
  maxRetries?: number;
  tools?: ToolSet;
};

export const aiRequestConfigSchema: z.ZodType<AiRequestConfig> = z.object({
  provider: z.enum(aiProviders),
  model: z.string().trim().min(1, "Model is required."),
  thinking: z.enum(aiThinkingLevels),
  maxOutputTokens: z
    .number()
    .int("maxOutputTokens must be an integer.")
    .min(1, "maxOutputTokens must be at least 1.")
    .optional(),
  maxRetries: z
    .number()
    .int("maxRetries must be an integer.")
    .min(0, "maxRetries must be at least 0.")
    .optional(),
  tools: z
    .custom<ToolSet>(isToolSet, {
      message: "Tools must be a Vercel AI SDK ToolSet.",
    })
    .optional(),
});
