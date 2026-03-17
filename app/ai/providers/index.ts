import "server-only";

import { AiProvider, type AiRequestConfig } from "../contracts";
import {
  buildOpenAIProviderOptions,
  resolveOpenAILanguageModel,
} from "./openai";

export function resolveLanguageModel(config: AiRequestConfig) {
  switch (config.provider) {
    case AiProvider.OpenAI:
      return resolveOpenAILanguageModel(config.model);
    case AiProvider.Anthropic:
      throw new Error(`Provider "${config.provider}" is not configured yet.`);
    default:
      throw new Error(`Unsupported AI provider "${config.provider}".`);
  }
}

export function buildProviderOptions(
  config: AiRequestConfig,
  sessionId?: string,
) {
  switch (config.provider) {
    case AiProvider.OpenAI:
      return buildOpenAIProviderOptions(config.thinking, sessionId);
    case AiProvider.Anthropic:
      throw new Error(`Provider "${config.provider}" is not configured yet.`);
    default:
      throw new Error(`Unsupported AI provider "${config.provider}".`);
  }
}
