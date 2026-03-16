import { z } from "zod";
import {
  AiConfigurationError,
  AiGenerationError,
  type AiMessage,
  type AiProviderClient,
  type GenerateObjectRequest,
  type GenerateObjectResult,
  type GenerateTextRequest,
  type GenerateTextResult,
} from "./contracts";
import { AiProvider } from "./types";

type OpenAiProviderOptions = {
  apiKey?: string;
};

type OpenAiChatMessage = {
  role: AiMessage["role"];
  content: string;
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const sanitizeSessionId = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  return value.replace(/[^a-zA-Z0-9-_:.]/g, "_").slice(0, 64) || undefined;
};

const buildMessages = ({
  instructions,
  messages,
  prompt,
}: Pick<GenerateTextRequest, "instructions" | "messages" | "prompt">): OpenAiChatMessage[] => {
  const normalizedMessages = messages?.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    ...(instructions ? [{ role: "system" as const, content: instructions }] : []),
    ...(normalizedMessages ?? []),
    { role: "user", content: prompt },
  ];
};

const getResponseText = (response: OpenAiResponse) => {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text?.trim() : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
};

export class OpenAiProvider implements AiProviderClient {
  constructor(private readonly options: OpenAiProviderOptions) {}

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResult> {
    const response = await this.requestOpenAi({
      model: request.config.model,
      messages: buildMessages(request),
      reasoning_effort: request.config.thinkingLevel,
      user: sanitizeSessionId(request.sessionId),
    });

    const text = getResponseText(response);

    if (!text) {
      throw new AiGenerationError("OpenAI returned an empty text response.");
    }

    return {
      provider: AiProvider.OpenAI,
      model: request.config.model,
      text,
    };
  }

  async generateObject<TSchema extends z.ZodTypeAny>(
    request: GenerateObjectRequest<TSchema>,
  ): Promise<GenerateObjectResult<z.infer<TSchema>>> {
    const response = await this.requestOpenAi({
      model: request.config.model,
      messages: buildMessages(request),
      reasoning_effort: request.config.thinkingLevel,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: request.schemaName ?? "generated_object",
          strict: true,
          schema: z.toJSONSchema(request.schema),
        },
      },
      user: sanitizeSessionId(request.sessionId),
    });

    const rawText = getResponseText(response);

    if (!rawText) {
      throw new AiGenerationError("OpenAI returned an empty structured response.");
    }

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawText);
    } catch (error) {
      throw new AiGenerationError("OpenAI did not return valid JSON.", {
        cause: error,
      });
    }

    const parsedObject = request.schema.safeParse(parsedJson);

    if (!parsedObject.success) {
      throw new AiGenerationError("OpenAI returned JSON that did not match the schema.");
    }

    return {
      provider: AiProvider.OpenAI,
      model: request.config.model,
      object: parsedObject.data,
      rawText,
    };
  }

  private async requestOpenAi(body: Record<string, unknown>): Promise<OpenAiResponse> {
    if (!this.options.apiKey) {
      throw new AiConfigurationError("OPENAI_API_KEY is required to use OpenAI.");
    }

    let response: Response;

    try {
      response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AiGenerationError("Unable to reach OpenAI.", {
        cause: error,
      });
    }

    if (!response.ok) {
      let message = `OpenAI request failed with status ${response.status}.`;

      try {
        const errorResponse = (await response.json()) as {
          error?: { message?: string };
        };

        if (typeof errorResponse.error?.message === "string") {
          message = errorResponse.error.message;
        }
      } catch {
        // Ignore JSON parsing errors and keep the generic status message.
      }

      if (response.status === 401 || response.status === 403) {
        throw new AiConfigurationError(message);
      }

      throw new AiGenerationError(message);
    }

    return (await response.json()) as OpenAiResponse;
  }
}
