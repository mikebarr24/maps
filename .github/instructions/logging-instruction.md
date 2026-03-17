# Logging instructions

Use the shared logger in `db/logger.ts` for application logging. Prefer `logger.info`, `logger.warn`, and `logger.error` over `console.log` for repo-level event logging.

## Logging conventions

- Treat `event_logs` as the source of truth for structured application events.
- Use dot-delimited event types such as `activity.created`, `activity.updated`, or `activity.delete.failed`.
- Set a meaningful `source` so logs can be traced back to the feature area, such as `admin.actions`.
- Include structured `metadata` with identifiers and the relevant record values, but do not log secrets.

## Database write flows

- When a database write and its success log should succeed or fail together, wrap them in `db.transaction(...)`.
- Pass the transaction writer to the logger as the second argument so the log entry is written inside the same transaction.
- Prefer `returning(...)` on inserts, updates, and deletes when the log should capture the actual row that was written.

## Error logging

- For handled failures, log with `logger.error(...)` and include the attempted identifiers or values in `metadata`.
- If logging itself fails on an error path, surface that explicitly with `console.error` so the original user-facing error response is not masked and the logging failure is still visible.
