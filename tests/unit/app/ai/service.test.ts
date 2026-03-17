import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  generateTextMock,
  outputObjectMock,
  outputTextMock,
  resolveLanguageModelMock,
  buildProviderOptionsMock,
} = vi.hoisted(() => ({
  generateTextMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  outputObjectMock: vi.fn((value: unknown) => value),
  outputTextMock: vi.fn(() => ({ type: "text" })),
  resolveLanguageModelMock: vi.fn(() => ({ id: "mock-model" })),
  buildProviderOptionsMock: vi.fn(() => ({ openai: { user: "session-123" } })),
}));

vi.mock("server-only", () => ({}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();

  return {
    ...actual,
    generateText: generateTextMock,
    Output: {
      object: outputObjectMock,
      text: outputTextMock,
    },
  };
});

vi.mock("../../../../app/ai/providers", () => ({
  resolveLanguageModel: resolveLanguageModelMock,
  buildProviderOptions: buildProviderOptionsMock,
}));

import {
  AiProvider,
  AiThinkingLevel,
  aiRequestConfigSchema,
} from "../../../../app/ai/contracts";
import {
  generatePlainText,
  generateStructuredOutput,
} from "../../../../app/ai/service";

const placeLookupTool = tool({
  description: "Look up a place by query.",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => ({
    query,
    found: true,
  }),
});

describe("app/ai/service", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    outputObjectMock.mockClear();
    outputTextMock.mockClear();
    resolveLanguageModelMock.mockClear();
    buildProviderOptionsMock.mockClear();
  });

  it("accepts optional Vercel AI SDK tools in the request config schema", () => {
    const result = aiRequestConfigSchema.safeParse({
      provider: AiProvider.OpenAI,
      model: "gpt-5-mini",
      thinking: AiThinkingLevel.Low,
      tools: {
        lookupPlace: placeLookupTool,
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts provider-defined tools in the request config schema", () => {
    const result = aiRequestConfigSchema.safeParse({
      provider: AiProvider.OpenAI,
      model: "gpt-5-mini",
      thinking: AiThinkingLevel.Low,
      tools: {
        webSearch: openai.tools.webSearch(),
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts the none thinking level in the request config schema", () => {
    const result = aiRequestConfigSchema.safeParse({
      provider: AiProvider.OpenAI,
      model: "gpt-5.4-mini",
      thinking: AiThinkingLevel.None,
    });

    expect(result.success).toBe(true);
  });

  it("passes config tools through to structured generation", async () => {
    const schema = z.object({
      answer: z.string(),
    });
    const tools = {
      lookupPlace: placeLookupTool,
    };

    generateTextMock.mockResolvedValue({
      output: {
        answer: "done",
      },
    });

    const result = await generateStructuredOutput({
      instructions: "Return an answer.",
      prompt: "Use tools when helpful.",
      schema,
      sessionId: "session-123",
      config: {
        provider: AiProvider.OpenAI,
        model: "gpt-5-mini",
        thinking: AiThinkingLevel.Low,
        tools,
      },
    });

    expect(result).toEqual({ answer: "done" });
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools,
      }),
    );
  });

  it("passes config tools through to plain-text generation", async () => {
    const tools = {
      lookupPlace: placeLookupTool,
    };

    generateTextMock.mockResolvedValue({
      output: "done",
    });

    const result = await generatePlainText({
      instructions: "Return plain text.",
      prompt: "Use tools when helpful.",
      sessionId: "session-123",
      config: {
        provider: AiProvider.OpenAI,
        model: "gpt-5-mini",
        thinking: AiThinkingLevel.Low,
        tools,
      },
    });

    expect(result).toBe("done");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools,
      }),
    );
  });
});
