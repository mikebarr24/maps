# Testing Instructions

This project uses three main validation layers:

- `npm run lint` for ESLint
- `npm run build` for a production build check
- `npm run test:unit` for Vitest unit tests

Playwright end-to-end coverage also exists, but it is not the default local validation step for routine changes. The pull request pipeline already runs the e2e suite unless you explicitly need to run it locally.

## Prerequisites

- Node.js 24+
- npm 11
- Docker Desktop or another local Docker runtime
- `DATABASE_URL=postgres://postgres:postgres@localhost:5433/maps`

The app relies on a local Postgres container for database-backed flows. `npm run dev` automatically runs `scripts/ensure-dev-db.mjs` before starting Next.js, so normal local development does not require starting the database by hand.

## Recommended local validation flow

For routine local validation, run:

```bash
npm run lint
npm run build
npm run test:unit
```

Notes:

- `npm run build` requires `DATABASE_URL` to be set because the database environment is validated at import time.
- Use the most targeted checks first when you are iterating on a change.
- Do not treat `npm run test:e2e` as a required local step for every change; the PR pipeline covers that by default.

## Unit tests

Unit tests use Vitest and run in a Node environment.

Commands:

```bash
npm run test:unit
npm run test:unit:watch
```

Current unit test discovery is configured for:

```text
tests/unit/**/*.test.ts
```

When adding unit coverage, keep tests under `tests/unit/` and follow the `*.test.ts` naming pattern so Vitest continues to pick them up automatically.

## End-to-end tests

Playwright tests live under:

```text
tests/e2e
```

When adding e2e coverage, keep specs under `tests/e2e/` and follow the existing Playwright naming conventions used by the repo.

Install the browser once on a new machine:

```bash
npx playwright install chromium
```

Run the full suite:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

Run a single spec:

```bash
npx playwright test tests/e2e/<spec-file>.spec.ts
```

Run a single test case:

```bash
npx playwright test tests/e2e/<spec-file>.spec.ts -g "<test name>"
```

Important behavior:

- Playwright is configured with a `webServer`, so it starts `npm run dev -- --hostname 127.0.0.1 --port 3000` automatically.
- Locally, Playwright reuses an existing dev server when possible.
- Because the dev server runs the `predev` script, local e2e runs use the same database startup flow as normal development.
- Failure artifacts are written to `playwright-report/` and `test-results/`.

## Database-backed testing notes

If you need to manage the database yourself instead of relying on `npm run dev`, use:

```bash
docker compose up -d
npm run db:migrate
```

Stop the local services when you are done:

```bash
docker compose down
```

Use `npm run db:migrate` after pulling schema changes or before running tests that depend on the latest schema.

## CI behavior

GitHub Actions splits validation into two jobs:

### `validate`

This job runs:

```bash
npm run lint
npm run build
npm run test:unit
```

### `e2e`

This job:

```bash
npx playwright install --with-deps chromium
node scripts/ensure-dev-db.mjs
npm run db:migrate
npm run test:e2e
```

If Playwright fails in CI, artifacts from `playwright-report/` and `test-results/` are uploaded.

## Keeping this file current

This document is intended to stay useful as the test surface grows.

- Treat `package.json`, `vitest.config.ts`, `playwright.config.ts`, and `.github/workflows/tests.yml` as the source of truth for commands and execution behavior.
- If you add a new test script, test suite, or validation layer, update this file in the same change.
- Prefer documenting stable commands, locations, and conventions here rather than maintaining a hand-written inventory of every current test file.
- If local and CI validation intentionally diverge, document that difference explicitly here so new checks are not overlooked.

## Quick reference

Routine local checks:

```bash
npm run lint
npm run build
npm run test:unit
```

On-demand e2e:

```bash
npx playwright install chromium
npm run test:e2e
```
