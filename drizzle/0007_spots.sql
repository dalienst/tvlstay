CREATE TABLE "spots" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_requests" ADD COLUMN "deliver_to" text;--> statement-breakpoint
ALTER TABLE "guest_requests" ADD COLUMN "spot_id" integer;--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spots_code_idx" ON "spots" USING btree ("code");--> statement-breakpoint
CREATE INDEX "spots_facility_idx" ON "spots" USING btree ("facility_id");--> statement-breakpoint
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE set null ON UPDATE no action;