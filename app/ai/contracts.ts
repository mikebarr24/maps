import { z } from "zod";

export enum AiProvider {
  OpenAI = "openai",
}

export type AiThinkingLevel = "low" | "medium" | "high";

export type AiGenerationConfig = {
  provider: AiProvider;
  model: string;
  thinkingLevel?: AiThinkingLevel;
};

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiBaseRequest = {
  instructions?: string;
  prompt: string;
  sessionId?: string;
  config: AiGenerationConfig;
  messages?: AiMessage[];
};

export type GenerateTextRequest = AiBaseRequest;

export type GenerateTextResult = {
  provider: AiProvider;
  model: string;
  text: string;
};

export type GenerateObjectRequest<TSchema extends z.ZodTypeAny> = AiBaseRequest & {
  schema: TSchema;
  schemaName?: string;
};

export type GenerateObjectResult<TObject> = {
  provider: AiProvider;
  model: string;
  object: TObject;
  rawText: string;
};

export interface AiProviderClient {
  generateText(request: GenerateTextRequest): Promise<GenerateTextResult>;
  generateObject<TSchema extends z.ZodTypeAny>(
    request: GenerateObjectRequest<TSchema>,
  ): Promise<GenerateObjectResult<z.infer<TSchema>>>;
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}
