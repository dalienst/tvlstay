ALTER TABLE "properties" ADD COLUMN "events_brand" text;--> statement-breakpoint
UPDATE "properties" SET "events_brand" = 'tamarind_village' WHERE "slug" = 'village' AND "events_brand" IS NULL;--> statement-breakpoint
UPDATE "properties" SET "events_brand" = 'tamarind_restaurant' WHERE "slug" = 'mombasa' AND "events_brand" IS NULL;
