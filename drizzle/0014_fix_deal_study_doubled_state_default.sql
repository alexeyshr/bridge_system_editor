ALTER TABLE "content_deal_studies"
  ALTER COLUMN "doubled_state" SET DEFAULT 'N';
--> statement-breakpoint
UPDATE "content_deal_studies"
SET "doubled_state" = 'N'
WHERE "doubled_state" = 'none';
