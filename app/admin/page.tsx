import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes } from "@/db/schema";
import {
  AdminPortal,
  AdminPortalHero,
  AdminPortalNotice,
  AdminPortalSection,
} from "./AdminPortal";
import { ActivityFormCard, ActivityTypeFormCard } from "./AdminForms";
import { ActivityRecordsCard, ActivityTypeRecordsCard } from "./AdminRecords";

export const dynamic = "force-dynamic";

const hasCode = (value: unknown, code: string) =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  (value as { code?: string }).code === code;

const isMissingRelationError = (error: unknown) =>
  hasCode(error, "42P01") ||
  (typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    hasCode((error as { cause?: unknown }).cause, "42P01"));

async function loadAdminData() {
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
    if (isMissingRelationError(error)) {
      return {
        activityRows: [],
        activityTypeRows: [],
        isSchemaReady: false,
      };
    }

    throw error;
  }
}

export default async function AdminPage() {
  const { activityTypeRows, activityRows, isSchemaReady } =
    await loadAdminData();

  return (
    <AdminPortal>
      <AdminPortalHero
        eyebrow="Admin Portal"
        title="Manage map activity filters"
        description="Create top-level activity types and the specific activities that will be used to filter the outdoor map. This page currently has no access control, so add auth before exposing it outside local development."
      />

      {!isSchemaReady ? (
        <AdminPortalNotice>
          <p className="m-0 font-medium">
            The admin schema is not in the database yet.
          </p>
          <p className="m-0 mt-2">
            Run the generated Drizzle migration, then reload this page.
          </p>
        </AdminPortalNotice>
      ) : null}

      <AdminPortalSection
        eyebrow="Catalog"
        title="Activity types"
        description="Create and manage the top-level groups that activities belong to."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
          <ActivityTypeFormCard isSchemaReady={isSchemaReady} />
          <ActivityTypeRecordsCard
            activityTypes={activityTypeRows.map((activityType) => ({
              id: activityType.id,
              name: activityType.name,
              updatedAt: activityType.updatedAt.toISOString(),
            }))}
          />
        </div>
      </AdminPortalSection>

      <AdminPortalSection
        eyebrow="Filters"
        title="Activities"
        description="Create and manage the specific filters that will appear on the map under each activity type."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <ActivityFormCard
            activityTypes={activityTypeRows.map((activityType) => ({
              id: activityType.id,
              name: activityType.name,
            }))}
            isSchemaReady={isSchemaReady}
          />
          <ActivityRecordsCard
            activityTypeOptions={activityTypeRows.map((activityType) => ({
              id: activityType.id,
              name: activityType.name,
            }))}
            activities={activityRows.map((activity) => ({
              id: activity.id,
              activityTypeId: activity.activityTypeId,
              activityTypeName: activity.activityTypeName,
              title: activity.title,
              description: activity.description,
              customPrompt: activity.customPrompt,
              isPublished: activity.isPublished,
              updatedAt: activity.updatedAt.toISOString(),
            }))}
          />
        </div>
      </AdminPortalSection>
    </AdminPortal>
  );
}
