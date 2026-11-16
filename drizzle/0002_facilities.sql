CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'sparkle' NOT NULL,
	"summary" text,
	"details" text,
	"image_url" text,
	"location" text,
	"extension" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_note" text,
	"is_requestable" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"kind" text NOT NULL,
	"facility_id" integer,
	"service_id" integer,
	"title" text NOT NULL,
	"message" text,
	"room_id" integer,
	"room_label" text,
	"guest_name" text,
	"contact" text,
	"status" text DEFAULT 'new' NOT NULL,
	"staff_note" text,
	"handled_by" text,
	"source_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opening_hours" ALTER COLUMN "outlet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "facility_id" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "requests_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_services" ADD CONSTRAINT "facility_services_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_service_id_facility_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."facility_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_property_slug_idx" ON "facilities" USING btree ("property_id","slug");--> statement-breakpoint
CREATE INDEX "facility_services_facility_idx" ON "facility_services" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "guest_requests_property_status_idx" ON "guest_requests" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "guest_requests_created_idx" ON "guest_requests" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opening_hours_facility_idx" ON "opening_hours" USING btree ("facility_id");--> statement-breakpoint
-- Pools, gym, spa and other facilities added as outlets during Phase 2 move to the new facilities table, with their hours.
INSERT INTO "facilities" ("property_id", "slug", "name", "icon", "summary", "image_url", "location", "extension", "sort_order", "is_published")
SELECT "property_id", "slug", "name",
  CASE "kind" WHEN 'pool' THEN 'pool' WHEN 'gym' THEN 'dumbbell' WHEN 'spa' THEN 'sparkle' WHEN 'beach' THEN 'sun' ELSE 'sparkle' END,
  "description", "image_url", "location", "extension", "sort_order", "is_published"
FROM "outlets" WHERE "kind" IN ('pool', 'gym', 'spa', 'beach', 'facility')
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "opening_hours" h SET "facility_id" = f."id", "outlet_id" = NULL
FROM "outlets" o JOIN "facilities" f ON f."property_id" = o."property_id" AND f."slug" = o."slug"
WHERE h."outlet_id" = o."id" AND o."kind" IN ('pool', 'gym', 'spa', 'beach', 'facility');--> statement-breakpoint
DELETE FROM "outlets" WHERE "kind" IN ('pool', 'gym', 'spa', 'beach', 'facility');--> statement-breakpoint
-- Village reception extension, confirmed by the user on 15 Nov 2026 (only if not already set in the admin).
UPDATE "properties" SET "reception_ext" = '325' WHERE "slug" = 'village' AND "reception_ext" IS NULL;
