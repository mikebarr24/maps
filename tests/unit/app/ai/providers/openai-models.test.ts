import { describe, expect, it } from "vitest";
import {
  OpenAIModel,
  supportedOpenAIModels,
} from "../../../../../app/ai/providers/openai-models";

describe("app/ai/providers/openai-models", () => {
  it("includes the supported OpenAI allowlist entries", () => {
    expect(supportedOpenAIModels).toEqual(
      expect.arrayContaining([
        OpenAIModel.Gpt5Mini,
        OpenAIModel.Gpt5,
        OpenAIModel.Gpt54Mini,
        OpenAIModel.Gpt54Nano,
        OpenAIModel.Gpt53Chat,
        OpenAIModel.Gpt4o,
      ]),
    );
  });
});
