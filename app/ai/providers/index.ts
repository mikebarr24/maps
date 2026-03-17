import type { AiGenerationConfig, AiProviderClient } from "../contracts";
import { type AiModel, AiProvider } from "../types";
import { createOpenAiProviderClient, DEFAULT_OPENAI_MODEL } from "./openai";

export function getDefaultModelForProvider(provider: AiProvider): AiModel {
  switch (provider) {
    case AiProvider.OpenAI:
      return DEFAULT_OPENAI_MODEL;
  }
}

export function getProviderClient(config: AiGenerationConfig): AiProviderClient {
  switch (config.provider) {
    case AiProvider.OpenAI:
      return createOpenAiProviderClient();
  }
}
