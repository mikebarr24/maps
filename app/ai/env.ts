import { z } from "zod";
import { AiProvider } from "./contracts";
import { OpenAiModel } from "./models";

const aiEnvSchema = z.object({
  AI_PROVIDER: z.enum(AiProvider).default(AiProvider.OpenAI),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  OPENAI_MODEL: z.string().trim().min(1).default(OpenAiModel.Gpt41Mini),
});

export type AiEnv = z.infer<typeof aiEnvSchema>;

export function getAiEnv(): AiEnv {
  return aiEnvSchema.parse({
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}
