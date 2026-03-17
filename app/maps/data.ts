import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes } from "@/db/schema";
import type { MapActivityType } from "./types";

const hasCode = (value: unknown, code: string) =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  (value as { code?: string }).code === code;

const isSchemaMismatchError = (error: unknown) =>
  hasCode(error, "42P01") ||
  hasCode(error, "42703") ||
  (typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    (hasCode((error as { cause?: unknown }).cause, "42P01") ||
      hasCode((error as { cause?: unknown }).cause, "42703")));

export async function loadMapsData() {
  try {
    const rows = await db
      .select({
        activityTypeId: activityTypes.id,
        activityTypeName: activityTypes.name,
        activityId: activities.id,
        activityTitle: activities.title,
        activityDescription: activities.description,
      })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(eq(activities.isPublished, true))
      .orderBy(
        asc(activityTypes.name),
        asc(activities.title),
        asc(activities.id),
      );

    const groupedTypes = new Map<number, MapActivityType>();

    for (const row of rows) {
      const existingType = groupedTypes.get(row.activityTypeId);

      if (existingType) {
        existingType.activities.push({
          id: row.activityId,
          title: row.activityTitle,
          description: row.activityDescription,
          activityTypeId: row.activityTypeId,
        });
        continue;
      }

      groupedTypes.set(row.activityTypeId, {
        id: row.activityTypeId,
        name: row.activityTypeName,
        activities: [
          {
            id: row.activityId,
            title: row.activityTitle,
            description: row.activityDescription,
            activityTypeId: row.activityTypeId,
          },
        ],
      });
    }

    return {
      activityTypes: [...groupedTypes.values()],
      isSchemaReady: true,
    };
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return {
        activityTypes: [] satisfies MapActivityType[],
        isSchemaReady: false,
      };
    }

    throw error;
  }
}
