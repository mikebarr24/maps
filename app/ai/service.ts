import "server-only";
import { z } from "zod";
import {
  type AiGenerationConfig,
  type GenerateObjectResult,
  type GenerateTextResult,
} from "./contracts";
import { getAiEnv } from "./env";
import { getDefaultModelForProvider, getProviderClient } from "./providers";

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
  const provider = config?.provider ?? env.AI_PROVIDER;

  return {
    provider,
    model: config?.model ?? getDefaultModelForProvider(provider),
    thinkingLevel: config?.thinkingLevel,
  };
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
