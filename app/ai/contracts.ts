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

export type AiRequestConfig = {
  provider: AiProvider;
  model: string;
  thinking: AiThinkingLevel;
};

export const aiRequestConfigSchema: z.ZodType<AiRequestConfig> = z.object({
  provider: z.enum(aiProviders),
  model: z.string().trim().min(1, "Model is required."),
  thinking: z.enum(aiThinkingLevels),
});
