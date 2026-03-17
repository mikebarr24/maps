import "server-only";

import { createProviderRegistry, generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  AiProvider,
  type AiThinkingLevel,
  type AiRequestConfig,
  aiRequestConfigSchema,
} from "./contracts";
import { getOpenAiEnv } from "./env";

const supportedOpenAiModels = ["gpt-5-mini", "gpt-5"] as const;

const structuredRequestSchema = z.object({
  instructions: z.string().trim().min(1, "AI instructions are required."),
  prompt: z.string().trim().min(1, "AI prompt is required."),
  sessionId: z.string().trim().min(1).optional(),
  config: aiRequestConfigSchema,
  schema: z.custom<z.ZodTypeAny>(
    (value): value is z.ZodTypeAny => value instanceof z.ZodType,
    { message: "A Zod schema is required for structured AI output." },
  ),
});

const plainTextRequestSchema = z.object({
  instructions: z.string().trim().min(1, "AI instructions are required."),
  prompt: z.string().trim().min(1, "AI prompt is required."),
  sessionId: z.string().trim().min(1).optional(),
  config: aiRequestConfigSchema,
});

type StructuredOutputRequest<TSchema extends z.ZodTypeAny> = {
  instructions: string;
  prompt: string;
  schema: TSchema;
  config: AiRequestConfig;
  sessionId?: string;
};

type PlainTextRequest = {
  instructions: string;
  prompt: string;
  config: AiRequestConfig;
  sessionId?: string;
};

let providerRegistry: ReturnType<typeof createProviderRegistry> | undefined;

function getProviderRegistry() {
  if (!providerRegistry) {
    providerRegistry = createProviderRegistry({
      openai: createOpenAI({
        apiKey: getOpenAiEnv().OPENAI_API_KEY,
      }),
    });
  }

  return providerRegistry;
}

function mapThinkingToOpenAiReasoningEffort(
  thinking: AiThinkingLevel,
) {
  return {
    minimal: "minimal",
    low: "low",
    medium: "medium",
    high: "high",
  }[thinking];
}

function resolveLanguageModel(config: AiRequestConfig) {
  switch (config.provider) {
    case AiProvider.OpenAI: {
      if (!supportedOpenAiModels.includes(config.model as (typeof supportedOpenAiModels)[number])) {
        throw new Error(
          `Unsupported model "${config.model}" for provider "${config.provider}". Supported models: ${supportedOpenAiModels.join(", ")}.`,
        );
      }

      return getProviderRegistry().languageModel(`openai:${config.model}`);
    }
    case AiProvider.Anthropic:
      throw new Error(
        `Provider "${config.provider}" is not configured yet.`,
      );
    default:
      throw new Error(`Unsupported AI provider "${config.provider}".`);
  }
}

function buildProviderOptions(config: AiRequestConfig, sessionId?: string) {
  switch (config.provider) {
    case AiProvider.OpenAI:
      return {
        openai: {
          reasoningEffort: mapThinkingToOpenAiReasoningEffort(config.thinking),
          user: sessionId,
        },
      };
    case AiProvider.Anthropic:
      throw new Error(
        `Provider "${config.provider}" is not configured yet.`,
      );
    default:
      throw new Error(`Unsupported AI provider "${config.provider}".`);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown AI service error.";
}

export async function generateStructuredOutput<TSchema extends z.ZodTypeAny>({
  instructions,
  prompt,
  schema,
  config,
  sessionId,
}: StructuredOutputRequest<TSchema>): Promise<z.infer<TSchema>> {
  structuredRequestSchema.parse({
    instructions,
    prompt,
    schema,
    config,
    sessionId,
  });

  try {
    const result = await generateText({
      model: resolveLanguageModel(config),
      system: instructions,
      prompt,
      output: Output.object({ schema }),
      providerOptions: buildProviderOptions(config, sessionId),
    });

    return schema.parse(result.output);
  } catch (error) {
    throw new Error(
      `AI generation failed for ${config.provider}/${config.model}: ${getErrorMessage(error)}`,
    );
  }
}

export async function generatePlainText({
  instructions,
  prompt,
  config,
  sessionId,
}: PlainTextRequest): Promise<string> {
  plainTextRequestSchema.parse({
    instructions,
    prompt,
    config,
    sessionId,
  });

  try {
    const result = await generateText({
      model: resolveLanguageModel(config),
      system: instructions,
      prompt,
      output: Output.text(),
      providerOptions: buildProviderOptions(config, sessionId),
    });

    return result.output;
  } catch (error) {
    throw new Error(
      `AI generation failed for ${config.provider}/${config.model}: ${getErrorMessage(error)}`,
    );
  }
}
