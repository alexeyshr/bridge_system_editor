CREATE TABLE "bridgesport_player_tournaments" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_player_id" integer NOT NULL,
	"player_name" varchar(191),
	"year" integer,
	"master_points" integer,
	"prize_points" integer,
	"rating_points" varchar(64),
	"place" varchar(64),
	"partner_team" varchar(255),
	"tournament" varchar(512) NOT NULL,
	"row_order" integer DEFAULT 0 NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bridgesport_player_tournaments_source_player_idx" ON "bridgesport_player_tournaments" USING btree ("source_player_id");
--> statement-breakpoint
CREATE INDEX "bridgesport_player_tournaments_source_player_year_idx" ON "bridgesport_player_tournaments" USING btree ("source_player_id","year");
