import { z } from "zod";
import { db } from "./index";
import {
  eventLogs,
  type EventLogLevel,
  type EventLogMetadata,
} from "./schema";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const logEventSchema = z.object({
  level: logLevelSchema,
  eventType: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().trim().min(1).max(120).optional(),
  sessionId: z.string().trim().min(1).max(120).optional(),
  errorName: z.string().trim().min(1).max(160).optional(),
  errorCode: z.string().trim().min(1).max(80).optional(),
  errorStack: z.string().trim().min(1).optional(),
});

export type LogEventInput = {
  eventType: string;
  message: string;
  source?: string;
  metadata?: EventLogMetadata;
  requestId?: string;
  sessionId?: string;
  level?: EventLogLevel;
};

export type LogErrorInput = Omit<LogEventInput, "level" | "message"> & {
  error: unknown;
  message?: string;
};

type NormalizedErrorDetails = {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
};

const normalizeError = (error: unknown): NormalizedErrorDetails => {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : undefined;

    return {
      message: error.message,
      name: error.name,
      code,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      name: "NonErrorThrown",
    };
  }

  return {
    message: "Unknown error",
    name: "UnknownError",
  };
};

const insertLog = async (input: z.input<typeof logEventSchema>) => {
  const entry = logEventSchema.parse(input);

  await db.insert(eventLogs).values({
    level: entry.level,
    eventType: entry.eventType,
    source: entry.source ?? null,
    message: entry.message,
    metadata: entry.metadata ?? null,
    requestId: entry.requestId ?? null,
    sessionId: entry.sessionId ?? null,
    errorName: entry.errorName ?? null,
    errorCode: entry.errorCode ?? null,
    errorStack: entry.errorStack ?? null,
  });
};

export async function logEvent(input: LogEventInput) {
  await insertLog({
    level: input.level ?? "info",
    eventType: input.eventType,
    source: input.source,
    message: input.message,
    metadata: input.metadata,
    requestId: input.requestId,
    sessionId: input.sessionId,
  });
}

export async function logError(input: LogErrorInput) {
  const normalizedError = normalizeError(input.error);

  await insertLog({
    level: "error",
    eventType: input.eventType,
    source: input.source,
    message: input.message ?? normalizedError.message,
    metadata: input.metadata,
    requestId: input.requestId,
    sessionId: input.sessionId,
    errorName: normalizedError.name,
    errorCode: normalizedError.code,
    errorStack: normalizedError.stack,
  });
}

export const logger = {
  log: logEvent,
  debug: (input: Omit<LogEventInput, "level">) =>
    logEvent({ ...input, level: "debug" }),
  info: (input: Omit<LogEventInput, "level">) =>
    logEvent({ ...input, level: "info" }),
  warn: (input: Omit<LogEventInput, "level">) =>
    logEvent({ ...input, level: "warn" }),
  error: logError,
};
