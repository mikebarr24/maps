This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Option 1: Run Locally On Your Host

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

When you run `npm run dev`, the local `maps-postgres` Docker container is started automatically and the command waits for Postgres to become healthy before Next.js boots.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Option 2: Run With Docker Compose

This repo includes `docker-compose.yml` for local Postgres development if you want to manage the database yourself.

Start the stack:

```bash
docker compose up
```

Run it in the background:

```bash
docker compose up -d
```

Stop it:

```bash
docker compose down
```

The Postgres container is exposed on `localhost:5433` for tools running on your host.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Browser Automation (Playwright)

Playwright is configured for end-to-end browser automation.

Install browser binaries (one-time setup on a new machine):

```bash
npx playwright install chromium
```

Run the e2e test suite:

```bash
npm run test:e2e
```

Run tests with a visible browser:

```bash
npm run test:e2e:headed
```

Open Playwright UI mode:

```bash
npm run test:e2e:ui
```

Generate automation steps by clicking in a browser:

```bash
npm run dev
# in another terminal:
npm run playwright:codegen
```

## Copilot Browser Control (MCP)

This repo now includes a local MCP server that keeps a persistent Playwright
browser session open so GitHub Copilot CLI can drive the app running in dev.

1. Start the Next.js dev server. This also ensures the local Docker Postgres container is running first:

   ```bash
   npm run dev -- --hostname 127.0.0.1 --port 3000
   ```

2. In Copilot CLI, add the local MCP server with `/mcp add`:

   - **Server Name:** `maps-browser`
   - **Server Type:** `STDIO`
   - **Command:** `npm`
   - **Arguments:** `run,mcp:browser`
   - **Environment Variables:** `{}`
   - **Tools:** `*`

3. Once connected, ask Copilot to use the browser tools. The MCP server exposes:

   - `browser_navigate` - open an absolute URL or a path like `/maps`
   - `browser_click` - click the first match for a Playwright selector
   - `browser_type` - fill a field and optionally press Enter
   - `browser_screenshot` - save a screenshot and return the image inline

Example prompts:

```text
Use maps-browser to navigate to /maps and take a screenshot.
Use maps-browser to click text=Hello World on the homepage.
```

Optional environment variables for the MCP server:

```bash
BROWSER_CONTROL_BASE_URL=http://127.0.0.1:3000
BROWSER_CONTROL_BROWSER=chromium
BROWSER_CONTROL_HEADLESS=true
BROWSER_CONTROL_TIMEOUT_MS=15000
BROWSER_CONTROL_OUTPUT_DIR=.browser-control
```

Screenshots are saved under `.browser-control/`, which is gitignored.

## Postgres With Drizzle

This repo is set up for Postgres via Drizzle ORM.

1. Put your Postgres connection string in `DATABASE_URL`.
   For host-based local development, `.env.local` is the simplest place.
2. Define tables in `db/schema.ts`.
3. Create migrations with `npm run db:generate`, then apply them with `npm run db:migrate`.
4. For local prototyping against your Docker database, `npm run db:push` is the fastest way to sync schema changes.
5. Open Drizzle Studio with `npm run db:studio`.

The reusable database client lives in `db/index.ts`.

Connection strings:

- Host machine talking to Docker Postgres: `postgres://postgres:postgres@localhost:5433/maps`

## AI-powered admin descriptions

The admin activity form can generate draft descriptions on the server using the
Vercel AI SDK. To enable that flow locally, add your OpenAI key to `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
```

The server-side AI integration is centralized under `app/ai/`, so app features
can choose a provider, model, and thinking level per request without importing
provider SDK details directly.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
