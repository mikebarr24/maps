export enum AiProvider {
  OpenAI = "openai",
}

export type AiModel = OpenAiModel | (string & {});

export enum OpenAiModel {
  // GPT-5
  Gpt54 = "gpt-5.4",
  Gpt54Pro = "gpt-5.4-pro",
  Gpt5 = "gpt-5",
  Gpt5Mini = "gpt-5-mini",
  Gpt5Nano = "gpt-5-nano",

  // GPT-4.1
  Gpt41 = "gpt-4.1",
  Gpt41Mini = "gpt-4.1-mini",
  Gpt41Nano = "gpt-4.1-nano",

  // GPT-4o
  Gpt4o = "gpt-4o",
  Gpt4oMini = "gpt-4o-mini",
  Gpt4oRealtime = "gpt-4o-realtime",
  Gpt4oMiniRealtime = "gpt-4o-mini-realtime",
  Gpt4oTranscribe = "gpt-4o-transcribe",
  Gpt4oMiniTranscribe = "gpt-4o-mini-transcribe",
  Gpt4oTranscribeDiarize = "gpt-4o-transcribe-diarize",
  Gpt4oMiniTts = "gpt-4o-mini-tts",

  // Reasoning and research
  O3 = "o3",
  O4Mini = "o4-mini",
  O3DeepResearch = "o3-deep-research",
  O4MiniDeepResearch = "o4-mini-deep-research",

  // Audio and realtime
  GptRealtime15 = "gpt-realtime-1.5",
  GptRealtime = "gpt-realtime",
  GptRealtimeMini = "gpt-realtime-mini",
  GptAudio15 = "gpt-audio-1.5",
  GptAudio = "gpt-audio",
  GptAudioMini = "gpt-audio-mini",

  // Images
  GptImage15 = "gpt-image-1.5",
  ChatGptImageLatest = "chatgpt-image-latest",
  GptImage1 = "gpt-image-1",
  GptImage1Mini = "gpt-image-1-mini",

  // Embeddings
  TextEmbedding3Small = "text-embedding-3-small",
  TextEmbedding3Large = "text-embedding-3-large",
  TextEmbeddingAda002 = "text-embedding-ada-002",
}
