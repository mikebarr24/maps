import { z } from "zod";
import { AiProvider } from "./types";
const aiEnvSchema = z.object({
  AI_PROVIDER: z.enum(AiProvider).default(AiProvider.OpenAI),
});

export type AiEnv = z.infer<typeof aiEnvSchema>;

export function getAiEnv(): AiEnv {
  return aiEnvSchema.parse({
    AI_PROVIDER: process.env.AI_PROVIDER,
  });
}
