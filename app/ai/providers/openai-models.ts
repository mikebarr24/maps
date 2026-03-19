export enum OpenAIModel {
  Gpt5Mini = "gpt-5-mini",
  Gpt5 = "gpt-5",
  Gpt54Mini = "gpt-5.4-mini",
  Gpt54Nano = "gpt-5.4-nano",
  Gpt53Chat = "gpt-5.3-chat-latest",
  Gpt4o = "gpt-4o",
}

export const supportedOpenAIModels = Object.values(OpenAIModel);
