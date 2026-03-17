import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchResultsSchema } from "../../../../app/maps/searchResultsSchema";

const {
  selectMock,
  fromMock,
  innerJoinMock,
  whereMock,
  limitMock,
  generateStructuredOutputMock,
  loggerErrorMock,
} = vi.hoisted(() => {
  const limit = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const where = vi.fn(() => ({
    limit,
  }));
  const innerJoin = vi.fn(() => ({
    where,
  }));
  const from = vi.fn(() => ({
    innerJoin,
  }));
  const select = vi.fn(() => ({
    from,
  }));

  return {
    selectMock: select,
    fromMock: from,
    innerJoinMock: innerJoin,
    whereMock: where,
    limitMock: limit,
    generateStructuredOutputMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    loggerErrorMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@/app/ai/service", () => ({
  generateStructuredOutput: generateStructuredOutputMock,
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

import { searchActivitiesAction } from "../../../../app/maps/actions";

describe("app/maps/actions", () => {
  beforeEach(() => {
    selectMock.mockClear();
    fromMock.mockClear();
    innerJoinMock.mockClear();
    whereMock.mockClear();
    limitMock.mockReset();
    generateStructuredOutputMock.mockReset();
    loggerErrorMock.mockReset();

    limitMock.mockResolvedValue([
      {
        id: 42,
        title: "Gritstone climbing",
        description: "Short trad routes on edges and quarries.",
        customPrompt: "Favor beginner-friendly options.",
        activityTypeName: "Climbing",
        sourceUrls: [
          "https://example.com/climbing",
          "https://example.com/guide",
        ],
      },
    ]);
    generateStructuredOutputMock.mockRejectedValue(new Error("AI blew up"));
    loggerErrorMock.mockResolvedValue(undefined);
  });

  it("logs AI search failures and preserves the user-facing error state", async () => {
    const formData = new FormData();

    formData.set("activityId", "42");
    formData.set("where", "Peak District");

    const result = await searchActivitiesAction(
      { status: "idle", results: [] },
      formData,
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Unable to search for places right now. Please try again.",
      results: [],
      activityId: 42,
      locationQuery: "Peak District",
    });
    expect(generateStructuredOutputMock).toHaveBeenCalledTimes(1);
    expect(generateStructuredOutputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining(
          "Do not use websites to brainstorm, rank, or describe places.",
        ),
        prompt: expect.stringContaining(
          "Use public websites only to find one supporting URL and very accurate coordinates for each chosen place.",
        ),
        config: expect.objectContaining({
          provider: "openai",
          model: "gpt-5.4-mini",
          thinking: "low",
          tools: expect.objectContaining({
            webSearch: expect.objectContaining({
              type: "provider",
              id: "openai.web_search",
            }),
          }),
        }),
      }),
    );
    expect(generateStructuredOutputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining(
          "Use websites only after choosing a candidate place, and only to capture one supporting original URL plus very accurate coordinates for that place.",
        ),
        prompt: expect.stringContaining(
          "Do not use web results to brainstorm extra venues or gather descriptive prose.",
        ),
        config: expect.objectContaining({
          provider: "openai",
          model: "gpt-5.4-mini",
          thinking: "low",
          tools: expect.objectContaining({
            webSearch: expect.objectContaining({
              type: "provider",
              id: "openai.web_search",
            }),
          }),
        }),
      }),
    );
    expect(loggerErrorMock).toHaveBeenCalledWith({
      eventType: "maps.search.failed",
      source: "maps.actions",
      message: "Failed to search for map activity places",
      error: expect.any(Error),
      metadata: {
        activityId: 42,
        activityTitle: "Gritstone climbing",
        activityTypeName: "Climbing",
        locationQueryLength: 13,
        hasCustomPrompt: true,
        sourceUrlCount: 2,
        provider: "openai",
        model: "gpt-5.4-mini",
        thinking: "low",
      },
    });
  });

  it("keeps the user-facing error response when logging fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const formData = new FormData();

    loggerErrorMock.mockRejectedValueOnce(new Error("event_logs unavailable"));
    formData.set("activityId", "42");
    formData.set("where", "Peak District");

    const result = await searchActivitiesAction(
      { status: "idle", results: [] },
      formData,
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Unable to search for places right now. Please try again.",
      results: [],
      activityId: 42,
      locationQuery: "Peak District",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[maps.actions] Failed to write error log",
      expect.objectContaining({
        eventType: "maps.search.failed",
        actionError: expect.any(Error),
        loggingError: expect.any(Error),
        metadata: {
          activityId: 42,
          activityTitle: "Gritstone climbing",
          activityTypeName: "Climbing",
          locationQueryLength: 13,
          hasCustomPrompt: true,
          sourceUrlCount: 2,
          provider: "openai",
          model: "gpt-5.4-mini",
          thinking: "low",
        },
      }),
    );
  });

  it("keeps originalUrl as a plain string in JSON schema while validating web URLs at runtime", () => {
    const jsonSchema = z.toJSONSchema(searchResultsSchema);

    expect(jsonSchema).toMatchObject({
      properties: {
        results: {
          items: {
            properties: {
              originalUrl: {
                type: "string",
              },
            },
          },
        },
      },
    });
    expect(JSON.stringify(jsonSchema)).not.toContain('"format":"uri"');

    expect(
      searchResultsSchema.safeParse({
        results: [
          {
            title: "Burbage South",
            latitude: 53.34,
            longitude: -1.62,
            shortDescription: "Popular gritstone edges with varied climbing.",
            originalUrl: "https://example.com/burbage-south",
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      searchResultsSchema.safeParse({
        results: [
          {
            title: "Burbage South",
            latitude: 53.34,
            longitude: -1.62,
            shortDescription: "Popular gritstone edges with varied climbing.",
            originalUrl: "not-a-url",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
