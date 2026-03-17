import type { AiProviderClient } from "../../contracts";
import { OpenAiProvider } from "./client";
import { getOpenAiEnv } from "./env";

export { DEFAULT_OPENAI_MODEL } from "./env";

export function createOpenAiProviderClient(): AiProviderClient {
  const openAiEnv = getOpenAiEnv();

  return new OpenAiProvider({
    apiKey: openAiEnv.OPENAI_API_KEY,
  });
}
