ALTER TABLE "facility_services" ADD COLUMN "prices" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "facility_services" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD COLUMN "option" text;