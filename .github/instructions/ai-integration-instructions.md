# AI integration instructions

Use this document alongside `.github/copilot-instructions.md` when working on the AI layer.

## Current AI architecture

- Keep the AI layer provider-agnostic at the service boundary under `app/ai/`.
- `app/ai/contracts.ts` defines the shared request contract:
  - `AiProvider` is an enum.
  - `AiRequestConfig` includes `provider`, `model`, `thinking`, and optional `tools`.
  - `thinking` supports `none`, `minimal`, `low`, `medium`, and `high`.
  - `tools` must be a Vercel AI SDK `ToolSet`.
  - Accepted tool entries are either executable SDK tools with `inputSchema` plus `execute`, or provider-backed tools with `type: "provider"`, a string `id`, and `inputSchema`.
- `app/ai/service.ts` is the entry point for callers:
  - Use `generateStructuredOutput` for schema-validated object responses.
  - Use `generatePlainText` for plain text responses.
  - Both methods accept `instructions`, `prompt`, `config`, and optional `sessionId`.
  - Both methods pass `config.tools` through to the underlying AI SDK request when tools are supplied.
- Keep provider-specific SDK setup and option mapping under `app/ai/providers/`.

## Provider wiring

- OpenAI is the only configured provider today.
- `app/ai/providers/openai.ts` owns:
  - OpenAI client creation via `@ai-sdk/openai`
  - supported model checks
  - reasoning effort mapping
  - provider options for OpenAI requests
  - provider-backed tool factories such as `createOpenAIWebSearchTool()`
- `app/ai/providers/index.ts` is the switchboard that resolves the active language model and provider options from `AiRequestConfig`.
- `Anthropic` exists in the provider enum but is intentionally not configured yet. Preserve the explicit error for unconfigured providers instead of adding silent fallbacks.

## Environment and runtime rules

- The OpenAI provider uses `OPENAI_API_KEY`.
- Validate the OpenAI API key lazily at provider use time, not at app startup. The current implementation only throws when the OpenAI provider is actually invoked.
- Keep AI modules server-only.

## Supported OpenAI behavior

- Supported OpenAI models are currently `gpt-5-mini`, `gpt-5`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.3-chat-latest`, and `gpt-4o`.
- For reasoning-capable OpenAI models, map repo thinking levels directly to OpenAI `reasoningEffort`:
  - `none` -> `none`
  - `minimal` -> `minimal`
  - `low` -> `low`
  - `medium` -> `medium`
  - `high` -> `high`
- Omit `reasoningEffort` for non-reasoning models such as `gpt-4o`.
- Pass `sessionId` through to provider options as the OpenAI `user` value when present.
- The current provider-backed tool example is OpenAI web search, created with `createOpenAIWebSearchTool()` and attached to `AiRequestConfig.tools` under a caller-chosen key such as `webSearch`.

## Validation and error handling

- Validate AI inputs with Zod at the service boundary before calling the provider.
- For structured output, require a Zod schema and parse the returned output against that schema.
- Throw explicit errors that include provider/model context when generation fails.
- Do not add broad catch-and-ignore behavior, silent defaults, or success-shaped fallbacks.

## Extension guidance

- When adding a new provider:
  - extend `AiProvider`
  - add provider-specific wiring in `app/ai/providers/<provider>.ts`
  - update `app/ai/providers/index.ts`
  - keep the shared service contract unchanged unless the feature truly applies to every provider
- Reuse `generateStructuredOutput` and `generatePlainText` instead of introducing ad-hoc SDK calls in route or admin code.
- If future admin flows use AI, preserve the current split between server actions, validation, and shared AI service calls.
