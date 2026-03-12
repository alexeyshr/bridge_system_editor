DROP TABLE IF EXISTS "bridgesport_calendar_events";
--> statement-breakpoint
CREATE TABLE "bridgesport_calendar_tournaments" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_tournament_id" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"source_url" text,
	"city" varchar(191),
	"venue" varchar(255),
	"entry_fee" varchar(191),
	"date_label" varchar(120),
	"month_label" varchar(120),
	"tournament_category" varchar(120),
	"tournament_type" varchar(120),
	"tournament_format" varchar(191),
	"registration_open" boolean DEFAULT false NOT NULL,
	"registered_count" integer,
	"registration_deadline" varchar(120),
	"start_date" timestamp with time zone NOT NULL,
	"participants_count" integer DEFAULT 0 NOT NULL,
	"participants" jsonb,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_calendar_tournaments_source_id_unique" ON "bridgesport_calendar_tournaments" USING btree ("source_tournament_id");
--> statement-breakpoint
CREATE INDEX "bridgesport_calendar_tournaments_start_date_idx" ON "bridgesport_calendar_tournaments" USING btree ("start_date");
--> statement-breakpoint
CREATE INDEX "bridgesport_calendar_tournaments_city_idx" ON "bridgesport_calendar_tournaments" USING btree ("city");
