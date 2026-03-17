import "server-only";

import { z } from "zod";

const openAiEnvSchema = z.object({
  OPENAI_API_KEY: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .min(1, "OPENAI_API_KEY is required to use the OpenAI provider."),
  ),
});

export function getOpenAiEnv() {
  const parsed = openAiEnvSchema.safeParse({
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
