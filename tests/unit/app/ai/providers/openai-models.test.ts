import { describe, expect, it } from "vitest";
import {
  OpenAIModel,
  supportedOpenAIModels,
} from "../../../../../app/ai/providers/openai-models";

describe("app/ai/providers/openai-models", () => {
  it("includes the supported GPT-5.4 variants in the OpenAI allowlist", () => {
    expect(supportedOpenAIModels).toEqual(
      expect.arrayContaining([
        OpenAIModel.Gpt5Mini,
        OpenAIModel.Gpt5,
        OpenAIModel.Gpt54,
        OpenAIModel.Gpt54Mini,
        OpenAIModel.Gpt54Nano,
      ]),
    );
  });
});
