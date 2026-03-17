"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  AiProvider,
  AiThinkingLevel,
  type AiRequestConfig,
} from "@/app/ai/contracts";
import { OpenAIModel } from "@/app/ai/providers/openai-models";
import { createOpenAIWebSearchTool } from "@/app/ai/providers/openai";
import { generateStructuredOutput } from "@/app/ai/service";
import { db } from "@/db";
import { logger } from "@/db/logger";
import { activities, activityTypes } from "@/db/schema";
import { searchResultsSchema } from "./searchResultsSchema";
import type { MapSearchFormState } from "./types";

const searchRequestSchema = z.object({
  activityId: z.coerce.number().int().positive("Choose an activity."),
  where: z
    .string()
    .trim()
    .min(1, "Enter where you want to do this.")
    .max(160, "Where must be 160 characters or fewer."),
});

const mapSearchConfig: AiRequestConfig = {
  provider: AiProvider.OpenAI,
  model: OpenAIModel.Gpt54Mini,
  thinking: AiThinkingLevel.Low,
  tools: {
    webSearch: createOpenAIWebSearchTool(),
  },
};

const systemInstructions = `
You recommend real-world places for outdoor activities.

Use the provided activity context, optional custom prompt, and source URLs to find relevant places for the requested location.
Start with your own general knowledge to identify plausible places for the activity and area.
Use websites only to verify those places, obtain very accurate coordinates, and capture the supporting original URL.
Return up to 8 results.
Only return places that are plausible matches for the selected activity and requested area.
Prefer source-backed recommendations when source URLs are provided.
Each result must include:
- the place title
- latitude
- longitude
- a short description
- an original URL to a public webpage that supports the recommendation

Coordinates must be very accurate for the specific place, not a rough nearby estimate.
If you cannot determine accurate coordinates for a place from the websites provided, do not include that place in the results.

If no suitable places can be found, return an empty results array.
`.trim();

function getFieldErrors(error: z.ZodError): Record<string, string> | undefined {
  const flattened = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const entries = Object.entries(flattened)
    .map(([key, value]) => [key, value?.[0]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function buildPrompt(input: {
  activityTypeName: string;
  activityTitle: string;
  activityDescription: string;
  customPrompt: string | null;
  sourceUrls: string[];
  where: string;
}) {
  const sourceUrls =
    input.sourceUrls.length > 0
      ? input.sourceUrls
          .map((sourceUrl, index) => `${index + 1}. ${sourceUrl}`)
          .join("\n")
      : "No source URLs were provided for this activity type. Use reliable public sources and include the most relevant URL for each result.";

  return `
Requested location:
${input.where}

Activity type:
${input.activityTypeName}

Selected activity:
${input.activityTitle}

Activity description:
${input.activityDescription}

Custom prompt:
${input.customPrompt?.trim() || "No custom prompt was provided."}

Source URLs:
${sourceUrls}

Find real places for this activity in or near the requested location.
Make the suggestions specific and varied rather than repeating similar venues.
Use concise descriptions.
Use your own knowledge first to decide on likely places, then use public websites only to verify the coordinates and choose the supporting URL for each result.
Only include places when you can provide very accurate coordinates for the specific place, not a rough nearby estimate.
If you cannot be accurate with the coordinates, leave that place out.
`.trim();
}

const logMapSearchError = async ({
  eventType,
  message,
  error,
  metadata,
}: {
  eventType: string;
  message: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await logger.error({
      eventType,
      source: "maps.actions",
      message,
      error,
      metadata,
    });
  } catch (loggingError) {
    console.error("[maps.actions] Failed to write error log", {
      eventType,
      actionError: error,
      loggingError,
      metadata,
    });
  }
};

export async function searchActivitiesAction(
  _prevState: MapSearchFormState,
  formData: FormData,
): Promise<MapSearchFormState> {
  const parsed = searchRequestSchema.safeParse({
    activityId: formData.get("activityId"),
    where: formData.get("where"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error),
      submittedAt: Date.now(),
      results: [],
    };
  }

  const [selectedActivity] = await db
    .select({
      id: activities.id,
      title: activities.title,
      description: activities.description,
      customPrompt: activities.customPrompt,
      activityTypeName: activityTypes.name,
      sourceUrls: activityTypes.sourceUrls,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activities.id, parsed.data.activityId),
        eq(activities.isPublished, true),
      ),
    )
    .limit(1);

  if (!selectedActivity) {
    return {
      status: "error",
      message: "Choose a published activity before searching.",
      fieldErrors: {
        activityId: "Choose an activity.",
      },
      submittedAt: Date.now(),
      results: [],
      activityId: parsed.data.activityId,
      locationQuery: parsed.data.where,
    };
  }

  try {
    const output = await generateStructuredOutput({
      instructions: systemInstructions,
      prompt: buildPrompt({
        activityTypeName: selectedActivity.activityTypeName,
        activityTitle: selectedActivity.title,
        activityDescription: selectedActivity.description,
        customPrompt: selectedActivity.customPrompt,
        sourceUrls: selectedActivity.sourceUrls,
        where: parsed.data.where,
      }),
      schema: searchResultsSchema,
      config: mapSearchConfig,
    });

    return {
      status: "success",
      message:
        output.results.length === 0
          ? "No places matched that search."
          : `Found ${output.results.length} place${output.results.length === 1 ? "" : "s"}.`,
      submittedAt: Date.now(),
      results: output.results,
      activityId: parsed.data.activityId,
      locationQuery: parsed.data.where,
    };
  } catch (error) {
    await logMapSearchError({
      eventType: "maps.search.failed",
      message: "Failed to search for map activity places",
      error,
      metadata: {
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        activityTypeName: selectedActivity.activityTypeName,
        locationQueryLength: parsed.data.where.length,
        hasCustomPrompt: selectedActivity.customPrompt !== null,
        sourceUrlCount: selectedActivity.sourceUrls.length,
        provider: mapSearchConfig.provider,
        model: mapSearchConfig.model,
        thinking: mapSearchConfig.thinking,
      },
    });

    return {
      status: "error",
      message: "Unable to search for places right now. Please try again.",
      submittedAt: Date.now(),
      results: [],
      activityId: parsed.data.activityId,
      locationQuery: parsed.data.where,
    };
  }
}
