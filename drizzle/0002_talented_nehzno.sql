CREATE TABLE "event_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(16) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"source" varchar(120),
	"message" text NOT NULL,
	"metadata" jsonb,
	"error_name" varchar(160),
	"error_code" varchar(80),
	"error_stack" text,
	"request_id" varchar(120),
	"session_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_logs_level_idx" ON "event_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "event_logs_event_type_idx" ON "event_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "event_logs_created_at_idx" ON "event_logs" USING btree ("created_at");