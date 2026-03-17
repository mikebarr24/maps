import { z } from "zod";

export enum AiProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export const aiThinkingLevels = ["minimal", "low", "medium", "high"] as const;

export type AiThinkingLevel = (typeof aiThinkingLevels)[number];

export type AiRequestConfig = {
  provider: AiProvider;
  model: string;
  thinking: AiThinkingLevel;
};

export const aiRequestConfigSchema: z.ZodType<AiRequestConfig> = z.object({
  provider: z.enum(AiProvider),
  model: z.string().trim().min(1, "Model is required."),
  thinking: z.enum(aiThinkingLevels),
});
