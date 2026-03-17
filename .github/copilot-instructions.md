# Maps repository instructions

Read `soul.md` first before making changes. It is the repo's primary collaboration guide, and this file captures the repository-specific engineering workflow that should travel with the codebase.

## Working agreements

- When the user asks you to create a pull request and does not explicitly say otherwise, create it as a draft pull request by default.
- Always send a normal user-visible response in chat. Never rely on task completion UI alone to communicate that work is done.
- For conversational questions, answer in normal chat first; do not rely on task completion/status UI as the handoff.
- Only do what the user explicitly asked for. Do not predict follow-on work, widen scope, or add adjacent changes unless the user asks for them.
- Do not run Playwright end-to-end tests as part of routine local validation. The pull request pipeline should provide that coverage unless the user explicitly asks for a Playwright run.

## Build, test, lint, and local workflow

- `npm run dev` starts Next.js and, via `predev`, runs `scripts/ensure-dev-db.mjs` to bring up the `maps-postgres` Docker service and wait for it to become healthy. Use this for normal local development.
- Local Postgres runs on `localhost:5433`; the README uses `postgres://postgres:postgres@localhost:5433/maps` for host-based development.
- `npm run lint` runs ESLint.
- `npm run build` runs the production build. `db/env.ts` validates `DATABASE_URL` at import time, so build-time paths that touch the DB need `DATABASE_URL` set. CI applies migrations before building with `npm run db:migrate`.
- Database workflows use Drizzle: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`, and `npm run db:studio`.
- Install Playwright's Chromium binary once on a new machine with `npx playwright install chromium`.
- `npm run test:e2e` runs the Playwright suite.
- `npm run test:e2e:headed` runs Playwright headed.
- `npm run test:e2e:ui` opens Playwright UI mode.
- `npm run mcp:browser` starts the local Playwright-backed MCP server described in `README.md` for Copilot-driven browser control against a running dev server.
- Run a single spec with `npx playwright test tests/e2e/homepage.spec.ts`.
- Run a single test case with `npx playwright test tests/e2e/admin-activity-types.spec.ts -g "rejects non-https source URLs on the admin activity type form"`.
- Playwright already defines a `webServer` in `playwright.config.ts` that runs `npm run dev -- --hostname 127.0.0.1 --port 3000` and reuses an existing local server when possible.

## High-level architecture

- This is a Next.js App Router app. `app/layout.tsx` provides the global shell: Geist fonts, `ToastProvider`, and a shared `Navbar`. `app/page.tsx` is just a thin route entry that renders `app/App.tsx`.
- The `/maps` route is a client-only Leaflet experience. `app/maps/page.tsx` dynamically imports `UKMap` with `ssr: false`, and `app/maps/UKMap.tsx` owns the browser-only map behavior, including the RainViewer overlay toggle and its client-side fetches.
- The `/admin` route is server-rendered and intentionally split by responsibility. `app/admin/page.tsx` composes the page, `app/admin/data.ts` performs the Drizzle reads, and `app/admin/actions.ts` contains the server actions, Zod validation, DB writes, and `revalidatePath("/admin")` refreshes. Keep that page/data/action split when admin features grow.
- The database layer lives under `db/`. `db/schema.ts` defines the `activity_types` and `activities` tables plus relations, `db/index.ts` creates a shared Drizzle client on top of `postgres`, and `db/env.ts` is the strict `DATABASE_URL` gate.
- The admin data model is built around activity types containing many activities. Activity types store names and optional `sourceUrls`; activities add `description`, optional `customPrompt` text, and an `isPublished` flag.
- Browser automation has two layers. Playwright e2e tests live under `tests/e2e` and drive the app through the standard config in `playwright.config.ts`. Separately, `scripts/browser-control-server.mjs` exposes a persistent Playwright-backed MCP server (`npm run mcp:browser`) so Copilot can drive a running local app session.

## Key conventions

- Keep the theme as a single source of truth in `app/styles/theme.css`.
- Expose theme tokens to the app through Tailwind in `app/globals.css`.
- Prefer Tailwind utility classes such as `bg-*`, `text-*`, and `border-*` throughout the app.
- Do not introduce inline colour styles in components when a Tailwind theme token can be used instead.
- Reuse shared UI from `app/components/` before adding new common components. `Button` and other primitives already encode the repo's styling approach.
- When a route file starts mixing rendering with page-specific queries or loaders, extract that data logic into a nearby module such as `data.ts` and keep the page focused on composition.
- Server-side form handling on the admin side uses `useActionState` in client components plus server actions that return structured `AdminFormState` objects. Preserve that flow instead of introducing ad-hoc client fetches for the same forms.
- Validate form input with Zod in the server action layer and convert DB constraint failures into user-facing messages. `app/admin/actions.ts` is the reference pattern.
- Preserve the source URL rules in admin flows: `sourceUrls` are newline-separated, deduplicated, and must be HTTPS.
- The app uses `sonner` toast notifications through the shared `ToastProvider`; admin forms surface success/error states through toasts and `router.refresh()`.
- Store markdown planning artifacts in `plan/` when a reviewable repo-local plan file is needed.
