import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertMock,
  valuesMock,
  returningMock,
  loggerInfoMock,
  loggerErrorMock,
  revalidatePathMock,
} = vi.hoisted(() => {
  const returning = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const values = vi.fn(() => ({
    returning,
  }));
  const insert = vi.fn(() => ({
    values,
  }));

  return {
    insertMock: insert,
    valuesMock: values,
    returningMock: returning,
    loggerInfoMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
    loggerErrorMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
    revalidatePathMock: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
  },
}));

vi.mock("@/db/logger", () => ({
  logger: {
    info: loggerInfoMock,
    error: loggerErrorMock,
  },
}));

import { createActivityTypeAction } from "../../../../app/admin/actions";

describe("app/admin/actions", () => {
  beforeEach(() => {
    insertMock.mockClear();
    valuesMock.mockClear();
    returningMock.mockReset();
    loggerInfoMock.mockReset();
    loggerErrorMock.mockReset();
    revalidatePathMock.mockReset();
    vi.restoreAllMocks();

    returningMock.mockResolvedValue([
      {
        id: 1,
        name: "Walking",
        sourceUrls: ["https://example.com/feed"],
      },
    ]);
    loggerInfoMock.mockRejectedValue(new Error("event_logs unavailable"));
  });

  it("keeps successful admin writes from failing when info logging fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const formData = new FormData();

    formData.set("name", "Walking");
    formData.set("sourceUrls", "https://example.com/feed");

    const result = await createActivityTypeAction({ status: "idle" }, formData);

    expect(result).toMatchObject({
      status: "success",
      message: "Activity type created.",
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(loggerInfoMock).toHaveBeenCalledWith({
      eventType: "activity-type.created",
      source: "admin.actions",
      message: "Created activity type from admin",
      metadata: {
        activityTypeId: 1,
        name: "Walking",
        sourceUrls: ["https://example.com/feed"],
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[admin.actions] Failed to write info log",
      expect.objectContaining({
        eventType: "activity-type.created",
        loggingError: expect.any(Error),
        metadata: {
          activityTypeId: 1,
          name: "Walking",
          sourceUrls: ["https://example.com/feed"],
        },
      }),
    );
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });
});
