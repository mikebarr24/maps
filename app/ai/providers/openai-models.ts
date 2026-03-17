export enum OpenAIModel {
  Gpt5Mini = "gpt-5-mini",
  Gpt5 = "gpt-5",
  Gpt54 = "gpt-5.4",
  Gpt54Mini = "gpt-5.4-mini",
  Gpt54Nano = "gpt-5.4-nano",
}

export const supportedOpenAIModels = Object.values(OpenAIModel);
