import { z } from "zod";
import { type AiModel, OpenAiModel } from "../../types";

export const DEFAULT_OPENAI_MODEL: AiModel = OpenAiModel.Gpt5Mini;

const openAiEnvSchema = z.object({
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
});

export type OpenAiEnv = z.infer<typeof openAiEnvSchema>;

export function getOpenAiEnv(): OpenAiEnv {
  return openAiEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  });
}
