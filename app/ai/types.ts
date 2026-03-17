export enum AiProvider {
  OpenAI = "openai",
}

export type AiModel = OpenAiModel | (string & {});

export enum OpenAiModel {
  // GPT-5
  Gpt54 = "gpt-5.4",
  Gpt5 = "gpt-5",
  Gpt5Mini = "gpt-5-mini",
  Gpt5Nano = "gpt-5-nano",

  // GPT-4o
  Gpt4oMini = "gpt-4o-mini",
}
