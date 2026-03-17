import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventLogs } from "../../../db/schema";

const { insertMock, valuesMock } = vi.hoisted(() => {
  const values = vi.fn<(...args: unknown[]) => Promise<void>>();
  const insert = vi.fn(() => ({
    values,
  }));

  return {
    insertMock: insert,
    valuesMock: values,
  };
});

vi.mock("../../../db/index", () => ({
  db: {
    insert: insertMock,
  },
}));

import { logError, logEvent, logger } from "../../../db/logger";

describe("db/logger", () => {
  beforeEach(() => {
    insertMock.mockClear();
    valuesMock.mockReset();
    valuesMock.mockResolvedValue(undefined);
  });

  it("defaults events to info level and normalizes optional fields", async () => {
    await logEvent({
      eventType: "activity.created",
      message: "Activity created",
    });

    expect(insertMock).toHaveBeenCalledWith(eventLogs);
    expect(valuesMock).toHaveBeenCalledWith({
      level: "info",
      eventType: "activity.created",
      source: null,
      message: "Activity created",
      metadata: null,
      requestId: null,
      sessionId: null,
      errorName: null,
      errorCode: null,
      errorStack: null,
    });
  });

  it("supports level-specific helper methods", async () => {
    await logger.warn({
      eventType: "sync.delayed",
      message: "Sync is taking longer than expected",
      metadata: {
        retryCount: 2,
      },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
        eventType: "sync.delayed",
        metadata: {
          retryCount: 2,
        },
      }),
    );
  });

  it("supports a custom writer for transactional logging", async () => {
    const customValues = vi.fn<(...args: unknown[]) => Promise<void>>();
    const customInsert = vi.fn(() => ({
      values: customValues,
    }));

    customValues.mockResolvedValue(undefined);

    await logger.info(
      {
        eventType: "activity.created",
        message: "Activity created",
      },
      {
        insert: customInsert,
      },
    );

    expect(customInsert).toHaveBeenCalledWith(eventLogs);
    expect(customValues).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        eventType: "activity.created",
        message: "Activity created",
      }),
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("normalizes Error instances when logging failures", async () => {
    const error = new Error("Exploded") as Error & { code?: string };

    error.name = "SyncError";
    error.code = "SYNC_FAILED";
    error.stack = "stack-trace";

    await logError({
      eventType: "sync.failed",
      source: "job-runner",
      error,
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        eventType: "sync.failed",
        source: "job-runner",
        message: "Exploded",
        errorName: "SyncError",
        errorCode: "SYNC_FAILED",
        errorStack: "stack-trace",
      }),
    );
  });

  it("normalizes non-Error thrown values", async () => {
    await logger.error({
      eventType: "sync.failed",
      error: "plain string failure",
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        eventType: "sync.failed",
        message: "plain string failure",
        errorName: "NonErrorThrown",
        errorCode: null,
      }),
    );
  });

  it("rejects invalid event payloads before attempting an insert", async () => {
    await expect(
      logEvent({
        eventType: "   ",
        message: "Still invalid",
      }),
    ).rejects.toThrowError();

    expect(insertMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
  });
});
