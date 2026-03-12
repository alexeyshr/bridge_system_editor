CREATE TABLE "bridgesport_calendar_events" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_event_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_url" text,
	"city" varchar(191),
	"date_label" varchar(120),
	"month_label" varchar(120),
	"start_date" timestamp with time zone NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridgesport_players" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_player_id" integer NOT NULL,
	"name" varchar(191) NOT NULL,
	"city" varchar(191),
	"rank" varchar(32),
	"rating" integer,
	"rating_position" integer,
	"max_rating_position" integer,
	"prize_points" integer,
	"master_points" integer,
	"online_master_points" integer,
	"gambler_nick" varchar(120),
	"bbo_nick" varchar(120),
	"club" varchar(255),
	"tournaments_count" integer DEFAULT 0 NOT NULL,
	"profile_url" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridgesport_rating_snapshots" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_rating_id" integer NOT NULL,
	"rating_type" varchar(32) NOT NULL,
	"rating_type_name" varchar(120) NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_url" text,
	"snapshot_date" timestamp with time zone,
	"entries_count" integer DEFAULT 0 NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridgesport_tournaments" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_tournament_id" integer NOT NULL,
	"name" varchar(512) NOT NULL,
	"year" integer,
	"source_type" varchar(32),
	"tournament_url" text,
	"results_url" text,
	"results_rows" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"city" varchar(191),
	"month_label" varchar(120),
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_calendar_events_source_id_unique" ON "bridgesport_calendar_events" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "bridgesport_calendar_events_start_date_idx" ON "bridgesport_calendar_events" USING btree ("start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_players_source_id_unique" ON "bridgesport_players" USING btree ("source_player_id");--> statement-breakpoint
CREATE INDEX "bridgesport_players_name_idx" ON "bridgesport_players" USING btree ("name");--> statement-breakpoint
CREATE INDEX "bridgesport_players_rating_idx" ON "bridgesport_players" USING btree ("rating");--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_rating_snapshots_source_id_unique" ON "bridgesport_rating_snapshots" USING btree ("source_rating_id");--> statement-breakpoint
CREATE INDEX "bridgesport_rating_snapshots_type_date_idx" ON "bridgesport_rating_snapshots" USING btree ("rating_type_name","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_tournaments_source_id_unique" ON "bridgesport_tournaments" USING btree ("source_tournament_id");--> statement-breakpoint
CREATE INDEX "bridgesport_tournaments_year_idx" ON "bridgesport_tournaments" USING btree ("year");--> statement-breakpoint
CREATE INDEX "bridgesport_tournaments_start_date_idx" ON "bridgesport_tournaments" USING btree ("start_date");