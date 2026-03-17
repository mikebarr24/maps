import type { ToolSet } from "ai";
import { z } from "zod";

export enum AiProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export const aiProviders = [AiProvider.OpenAI, AiProvider.Anthropic] as const;

export enum AiThinkingLevel {
  Minimal = "minimal",
  Low = "low",
  Medium = "medium",
  High = "high",
}

export const aiThinkingLevels = Object.values(AiThinkingLevel) as [
  AiThinkingLevel,
  ...AiThinkingLevel[],
];

function isToolSet(value: unknown): value is ToolSet {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (tool) =>
      typeof tool === "object" &&
      tool !== null &&
      "execute" in tool &&
      typeof tool.execute === "function",
  );
}

export type AiRequestConfig = {
  provider: AiProvider;
  model: string;
  thinking: AiThinkingLevel;
  tools?: ToolSet;
};

export const aiRequestConfigSchema: z.ZodType<AiRequestConfig> = z.object({
  provider: z.enum(aiProviders),
  model: z.string().trim().min(1, "Model is required."),
  thinking: z.enum(aiThinkingLevels),
  tools: z
    .custom<ToolSet>(isToolSet, {
      message: "Tools must be a Vercel AI SDK ToolSet.",
    })
    .optional(),
});
