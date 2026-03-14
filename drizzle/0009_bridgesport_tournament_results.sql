CREATE TABLE "bridgesport_tournament_results" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"source_tournament_id" integer NOT NULL,
	"row_order" integer DEFAULT 0 NOT NULL,
	"place_label" text,
	"team_name" text,
	"players" text,
	"result_label" text,
	"prize_points" text,
	"rating_points" text,
	"master_points" text,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bridgesport_tournament_results_source_tournament_idx" ON "bridgesport_tournament_results" USING btree ("source_tournament_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bridgesport_tournament_results_source_row_unique" ON "bridgesport_tournament_results" USING btree ("source_tournament_id","row_order");
