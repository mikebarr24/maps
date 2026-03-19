import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AiThinkingLevel } from "../../../../../app/ai/contracts";
import { buildOpenAIProviderOptions } from "../../../../../app/ai/providers/openai";

describe("app/ai/providers/openai", () => {
  it("maps none thinking to OpenAI reasoningEffort none", () => {
    expect(
      buildOpenAIProviderOptions("gpt-5-mini", AiThinkingLevel.None, "session-123"),
    ).toEqual({
      openai: {
        reasoningEffort: "none",
        user: "session-123",
      },
    });
  });

  it("omits reasoningEffort for non-reasoning models such as gpt-4o", () => {
    expect(
      buildOpenAIProviderOptions("gpt-4o", AiThinkingLevel.Low, "session-123"),
    ).toEqual({
      openai: {
        user: "session-123",
      },
    });
  });

  it("omits reasoningEffort for non-reasoning chat models", () => {
    expect(
      buildOpenAIProviderOptions(
        "gpt-5.3-chat-latest",
        AiThinkingLevel.Low,
        "session-123",
      ),
    ).toEqual({
      openai: {
        user: "session-123",
      },
    });
  });
});
