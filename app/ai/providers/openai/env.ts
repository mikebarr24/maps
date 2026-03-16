import { z } from "zod";
import { OpenAiModel } from "../../models";

const openAiEnvSchema = z.object({
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  OPENAI_MODEL: z.string().trim().min(1).default(OpenAiModel.Gpt41Mini),
});

export type OpenAiEnv = z.infer<typeof openAiEnvSchema>;

export function getOpenAiEnv(): OpenAiEnv {
  return openAiEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}
