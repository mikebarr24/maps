CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type_id" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"custom_prompt" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activities_activity_type_idx" ON "activities" USING btree ("activity_type_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "activities_type_title_unique_idx" ON "activities" USING btree ("activity_type_id","title");
--> statement-breakpoint
CREATE UNIQUE INDEX "activity_types_name_unique_idx" ON "activity_types" USING btree ("name");
