# AI integration instructions

Use this document alongside `.github/copilot-instructions.md` when working on the AI layer.

## Current AI architecture

- Keep the AI layer provider-agnostic at the service boundary under `app/ai/`.
- `app/ai/contracts.ts` defines the shared request contract:
  - `AiProvider` is an enum.
  - `AiRequestConfig` includes `provider`, `model`, and `thinking`.
  - `thinking` is limited to `minimal`, `low`, `medium`, and `high`.
- `app/ai/service.ts` is the entry point for callers:
  - Use `generateStructuredOutput` for schema-validated object responses.
  - Use `generatePlainText` for plain text responses.
  - Both methods accept `instructions`, `prompt`, `config`, and optional `sessionId`.
- Keep provider-specific SDK setup and option mapping under `app/ai/providers/`.

## Provider wiring

- OpenAI is the only configured provider today.
- `app/ai/providers/openai.ts` owns:
  - OpenAI client creation via `@ai-sdk/openai`
  - supported model checks
  - reasoning effort mapping
  - provider options for OpenAI requests
- `app/ai/providers/index.ts` is the switchboard that resolves the active language model and provider options from `AiRequestConfig`.
- `Anthropic` exists in the provider enum but is intentionally not configured yet. Preserve the explicit error for unconfigured providers instead of adding silent fallbacks.

## Environment and runtime rules

- The OpenAI provider uses `OPENAI_API_KEY`.
- Validate the OpenAI API key lazily at provider use time, not at app startup. The current implementation only throws when the OpenAI provider is actually invoked.
- Keep AI modules server-only.

## Supported OpenAI behavior

- Supported OpenAI models are currently `gpt-5-mini` and `gpt-5`.
- Map repo thinking levels directly to OpenAI `reasoningEffort`:
  - `minimal` -> `minimal`
  - `low` -> `low`
  - `medium` -> `medium`
  - `high` -> `high`
- Pass `sessionId` through to provider options as the OpenAI `user` value when present.

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
