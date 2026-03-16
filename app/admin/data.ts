import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes } from "@/db/schema";

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

export async function loadAdminData() {
  try {
    const [activityTypeRows, activityRows] = await Promise.all([
      db.select().from(activityTypes).orderBy(asc(activityTypes.name)),
      db
        .select({
          id: activities.id,
          activityTypeId: activities.activityTypeId,
          title: activities.title,
          description: activities.description,
          customPrompt: activities.customPrompt,
          isPublished: activities.isPublished,
          updatedAt: activities.updatedAt,
          activityTypeName: activityTypes.name,
        })
        .from(activities)
        .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
        .orderBy(
          asc(activityTypes.name),
          asc(activities.title),
          desc(activities.id),
        ),
    ]);

    return {
      activityRows,
      activityTypeRows,
      isSchemaReady: true,
    };
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return {
        activityRows: [],
        activityTypeRows: [],
        isSchemaReady: false,
      };
    }

    throw error;
  }
}
