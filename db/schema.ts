import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const activityTypes = pgTable(
  "activity_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    sourceUrls: text("source_urls")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("activity_types_name_unique_idx").on(table.name),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    activityTypeId: integer("activity_type_id")
      .notNull()
      .references(() => activityTypes.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull(),
    customPrompt: text("custom_prompt"),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activities_activity_type_idx").on(table.activityTypeId),
    uniqueIndex("activities_type_title_unique_idx").on(
      table.activityTypeId,
      table.title,
    ),
  ],
);

export type EventLogLevel = "debug" | "info" | "warn" | "error";
export type EventLogMetadata = Record<string, unknown>;

export const eventLogs = pgTable(
  "event_logs",
  {
    id: serial("id").primaryKey(),
    level: varchar("level", { length: 16 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    source: varchar("source", { length: 120 }),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<EventLogMetadata>(),
    errorName: varchar("error_name", { length: 160 }),
    errorCode: varchar("error_code", { length: 80 }),
    errorStack: text("error_stack"),
    requestId: varchar("request_id", { length: 120 }),
    sessionId: varchar("session_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("event_logs_level_idx").on(table.level),
    index("event_logs_event_type_idx").on(table.eventType),
    index("event_logs_created_at_idx").on(table.createdAt),
  ],
);

export const activityTypesRelations = relations(activityTypes, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  activityType: one(activityTypes, {
    fields: [activities.activityTypeId],
    references: [activityTypes.id],
  }),
}));
