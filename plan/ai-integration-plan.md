# AI integration plan

## Current status

This is still in the planning stage.

- No application code has been added for AI integration yet.
- The recommended direction is a shared server-side AI interface with swappable provider modules.
- The suggested first scope is `text + structured JSON` output.

## Problem

Integrate an AI API into the app in a way that keeps provider-specific code isolated, so the rest of the system depends on a shared interface rather than directly on OpenAI, Anthropic, or another vendor SDK.

## Proposed approach

Build a server-side AI layer with three main pieces:

1. Shared domain contracts for prompts, messages, generation options, and normalized results.
2. Provider modules that implement the shared contract behind a common interface.
3. A small application-facing entrypoint that resolves the configured provider and is the only AI surface the rest of the app should call.

For the first version, plan around **text generation plus structured JSON output**. That is usually enough to support practical product features while still keeping the interface small and easy to evolve later for streaming, tool calling, retries, and provider fallbacks.

## Why this should be fairly easy here

- The app is still small and already has clean module boundaries.
- Server-side logic is already separated from route composition in places like `app/admin/data.ts` and `app/admin/actions.ts`.
- Environment validation already exists via `zod`, which is a good fit for provider config.

This is not a one-file change, but it is a straightforward architectural addition rather than a risky rewrite.

## Recommended architecture

### 1. AI contracts

Create a shared module for:

- a provider enum, with `OpenAI` as the first supported value
- chat/message input types
- model identifiers
- generation options
- normalized text result
- normalized structured result
- explicit error types or error mapping strategy

Keep the contract narrow. Avoid baking vendor-specific concepts into the shared interface.

### 2. Provider interface

Define a single interface that each provider implements, with methods along the lines of:

- `generateText(...)`
- `generateObject(...)`

Prefer a single request object rather than positional arguments. The first-pass object shape should include:

- `instructions`
- `prompt`
- `sessionId`
- `config` with provider enum selection, model selection, and thinking level
- `schema` for the expected JSON response shape
- optional structured context fields if prompt templating becomes important

Example direction:

```ts
generateObject({
  instructions,
  prompt,
  sessionId,
  config: {
    provider,
    model,
    thinkingLevel,
  },
  schema,
});
```

This keeps the API easy to extend later for retries, timeouts, message history, and provider-specific metadata without breaking call sites.

Do not expose raw SDK responses outside provider modules.

### 3. Provider implementations

Start with one concrete provider module first: OpenAI. Keep the others as planned follow-up modules once the shared contract feels right. The provider implementation should own:

- SDK calls
- provider-specific request shaping
- response normalization
- provider-specific error mapping

### 4. Provider resolution

Add a small resolver or factory that chooses the active provider from environment config. This keeps application code simple and makes future multi-provider support possible without touching call sites.

For the initial OpenAI integration, store the API key in `.env` as `OPENAI_API_KEY`.

### 5. Application-facing AI service

Expose a small service the app imports, for example from a dedicated server-only module. This service should:

- validate config
- obtain the active provider
- call the provider interface
- return normalized results

### 6. Initial integration point

Pick one focused server-side feature as the first consumer instead of wiring AI everywhere at once. Good candidates would be:

- generating or refining `activities.description`
- suggesting `customPrompt`
- producing structured admin suggestions from activity type inputs

### 7. Validation and observability

Plan for:

- config validation with `zod`
- explicit user-safe error messages at call sites
- lightweight logging around provider, model, and failure mode
- tests for provider selection and response normalization

## Suggested phases

### Phase 1: Foundation

- add shared AI types and interface
- add environment schema for AI config
- add provider resolver
- add server-only AI service entrypoint

### Phase 2: First provider

- install and configure the first provider SDK
- implement one provider module
- normalize text and JSON responses
- map common provider errors

### Phase 3: First product use

- integrate one server-side feature with the AI service
- add form or action level handling for failures and empty results
- keep UX simple and reversible

### Phase 4: Hardening

- add tests
- document env vars and usage
- optionally add a second provider to prove the abstraction

## Notes and considerations

- Keep all provider SDK usage on the server.
- Prefer one default provider in config rather than automatic fallback logic in the first pass.
- Use clear provider-specific environment variable names, starting with `OPENAI_API_KEY`.
- Delay streaming and tool calling until there is a real feature that needs them.
- If structured output is important, strongly prefer schema-validated object generation instead of parsing freeform text later.
- If this becomes central to the product, consider storing prompt and response metadata for debugging, but that can wait until after the first integration works.

## Working assumptions

- First version targets a server-side integration, not direct browser-side AI calls.
- First version supports `text + structured JSON`.
- `provider` should be represented by an enum, with `OpenAI` as the first supported provider.
- The request contract should support a `sessionId` so the app can handle multi-turn exchanges consistently.
