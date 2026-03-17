# Maps

`maps` is a Next.js App Router project for managing map activity filters and exploring them on an interactive UK map. The repo currently combines three main pieces:

- a simple home route used for shared UI experiments
- a client-side `/maps` experience built with Leaflet and an optional RainViewer rain overlay
- a server-rendered `/admin` portal for managing activity types and activities stored in Postgres via Drizzle

## Routes

- `/` - a lightweight demo page that currently exercises shared UI components such as the reusable popup
- `/maps` - a UK-focused interactive map using OpenTopoMap tiles, Leaflet, and a toggleable RainViewer radar overlay
- `/admin` - a data-management portal for activity types and activities

The admin route currently has no access control, so treat it as a local-development tool until authentication is added.

## What the admin portal manages

The Postgres schema is centered on two tables:

- `activity_types` - top-level groups with a unique name and optional newline-entered HTTPS source URLs
- `activities` - items that belong to an activity type and store a title, description, optional custom prompt, and a published flag

On the admin route you can create, update, and delete both record types. Source URLs are deduplicated and must use `https`.

## Local setup

### Prerequisites

- Node.js
- Docker Desktop or another local Docker runtime

### Environment

Copy the example file and adjust values if needed:

```bash
cp .env.example .env.local
```

Required:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/maps
```

Optional, only needed when using the OpenAI-backed AI service:

```bash
OPENAI_API_KEY=your_openai_api_key
```

### Start the app

Install dependencies, then start the dev server:

```bash
npm install
npm run dev
```

`npm run dev` runs `scripts/ensure-dev-db.mjs` first, which starts the local `maps-postgres` Docker container and waits for it to become healthy before Next.js boots.

Open [http://localhost:3000](http://localhost:3000) when the server is ready.

## Local Postgres and Drizzle

If you want to manage the database container yourself instead of relying on `npm run dev`, use Docker Compose directly:

```bash
docker compose up -d
```

Stop it with:

```bash
docker compose down
```

The Postgres container is exposed on `localhost:5433`, so host-based local development uses:

```bash
postgres://postgres:postgres@localhost:5433/maps
```

Drizzle commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

Use `npm run db:migrate` after pulling schema changes or whenever `/admin` reports that the schema is not in the database yet.

## Validation and test commands

Lint the codebase:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

`DATABASE_URL` must be set for builds because the database environment is validated at import time.

Start the production server after building:

```bash
npm run start
```

## Browser automation with Playwright

Install Chromium once on a new machine:

```bash
npx playwright install chromium
```

Run the end-to-end suite:

```bash
npm run test:e2e
```

Run tests headed:

```bash
npm run test:e2e:headed
```

Open Playwright UI mode:

```bash
npm run test:e2e:ui
```

Run a single spec:

```bash
npx playwright test tests/e2e/homepage.spec.ts
```

Run a single test case:

```bash
npx playwright test tests/e2e/admin-activity-types.spec.ts -g "rejects non-https source URLs on the admin activity type form"
```

Generate Playwright steps by clicking in a browser:

```bash
npm run dev
# in another terminal
npm run playwright:codegen
```

Playwright is configured with a `webServer`, so the test runner starts `npm run dev -- --hostname 127.0.0.1 --port 3000` automatically and reuses an existing local server when possible.

## Copilot browser control (MCP)

This repo includes a local Playwright-backed MCP server so GitHub Copilot CLI can drive a running app session in the browser.

1. Start the app:

   ```bash
   npm run dev -- --hostname 127.0.0.1 --port 3000
   ```

2. In Copilot CLI, add the MCP server with `/mcp add`:

   - **Server Name:** `maps-browser`
   - **Server Type:** `STDIO`
   - **Command:** `npm`
   - **Arguments:** `run,mcp:browser`
   - **Environment Variables:** `{}`
   - **Tools:** `*`

3. Ask Copilot to use the browser tools.

Exposed tools include:

- `browser_navigate`
- `browser_click`
- `browser_type`
- `browser_screenshot`

Example prompts:

```text
Use maps-browser to navigate to /maps and take a screenshot.
Use maps-browser to click text=Hello World on the homepage.
```

Optional MCP server environment variables:

```bash
BROWSER_CONTROL_BASE_URL=http://127.0.0.1:3000
BROWSER_CONTROL_BROWSER=chromium
BROWSER_CONTROL_HEADLESS=true
BROWSER_CONTROL_TIMEOUT_MS=15000
BROWSER_CONTROL_OUTPUT_DIR=.browser-control
```

Screenshots are written to `.browser-control/`, which is gitignored.

## Server-side AI service

The repo includes a provider-agnostic AI service under `app/ai/`. The service accepts:

- `provider`
- `model`
- `thinking`
- optional `sessionId`

It currently exposes helpers for plain-text and structured output generation on the server.

OpenAI is the only wired provider today. The current OpenAI model allowlist is:

- `gpt-5-mini`
- `gpt-5`

Thinking levels map to OpenAI reasoning effort:

- `minimal`
- `low`
- `medium`
- `high`

`OPENAI_API_KEY` is only required when the OpenAI provider is actually used.
