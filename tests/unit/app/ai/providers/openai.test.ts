import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AiThinkingLevel } from "../../../../../app/ai/contracts";
import { buildOpenAIProviderOptions } from "../../../../../app/ai/providers/openai";

describe("app/ai/providers/openai", () => {
  it("maps none thinking to OpenAI reasoningEffort none", () => {
    expect(buildOpenAIProviderOptions(AiThinkingLevel.None, "session-123")).toEqual(
      {
        openai: {
          reasoningEffort: "none",
          user: "session-123",
        },
      },
    );
  });
});
