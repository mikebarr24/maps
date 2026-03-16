import "server-only";
import { z } from "zod";
import {
  AiProvider,
  type AiGenerationConfig,
  type AiProviderClient,
  type GenerateObjectResult,
  type GenerateTextResult,
} from "./contracts";
import { getAiEnv } from "./env";
import { OpenAiProvider } from "./openai";
import { getOpenAiEnv } from "./providers/openai/env";

type PublicAiConfig = Partial<AiGenerationConfig>;

type PublicGenerateTextRequest = {
  instructions?: string;
  prompt: string;
  sessionId?: string;
  config?: PublicAiConfig;
  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

type PublicGenerateObjectRequest<TSchema extends z.ZodTypeAny> =
  PublicGenerateTextRequest & {
    schema: TSchema;
    schemaName?: string;
  };

const getResolvedConfig = (config?: PublicAiConfig): AiGenerationConfig => {
  const env = getAiEnv();
  const openAiEnv = getOpenAiEnv();

  return {
    provider: config?.provider ?? env.AI_PROVIDER,
    model: config?.model ?? openAiEnv.OPENAI_MODEL,
    thinkingLevel: config?.thinkingLevel,
  };
};

const getProviderClient = (config: AiGenerationConfig): AiProviderClient => {
  const openAiEnv = getOpenAiEnv();

  switch (config.provider) {
    case AiProvider.OpenAI:
      return new OpenAiProvider({
        apiKey: openAiEnv.OPENAI_API_KEY,
      });
  }
};

export async function generateText(
  request: PublicGenerateTextRequest,
): Promise<GenerateTextResult> {
  const config = getResolvedConfig(request.config);
  const provider = getProviderClient(config);

  return provider.generateText({
    ...request,
    config,
  });
}

export async function generateObject<TSchema extends z.ZodTypeAny>(
  request: PublicGenerateObjectRequest<TSchema>,
): Promise<GenerateObjectResult<z.infer<TSchema>>> {
  const config = getResolvedConfig(request.config);
  const provider = getProviderClient(config);

  return provider.generateObject({
    ...request,
    config,
  });
}
