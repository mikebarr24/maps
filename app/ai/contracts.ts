import { z } from "zod";

export enum AiProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export const aiThinkingLevels = ["minimal", "low", "medium", "high"] as const;

export type AiThinkingLevel = (typeof aiThinkingLevels)[number];

export const aiRequestConfigSchema = z.object({
  provider: z.nativeEnum(AiProvider),
  model: z.string().trim().min(1, "Model is required."),
  thinking: z.enum(aiThinkingLevels),
});

export type AiRequestConfig = z.infer<typeof aiRequestConfigSchema>;
