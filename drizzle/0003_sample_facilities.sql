-- Starting facilities for Tamarind Village (from the user's example, 15 Nov 2026):
-- Pools with a towel service, and Housekeeping with cleaning, dental kit and sewing kit.
-- Only adds what's missing, so it never duplicates a facility staff already created.
INSERT INTO "facilities" ("property_id", "slug", "name", "icon", "sort_order")
SELECT p."id", 'pools', 'Pools', 'pool', 0 FROM "properties" p
WHERE p."slug" = 'village'
  AND NOT EXISTS (SELECT 1 FROM "facilities" f WHERE f."property_id" = p."id" AND (f."icon" = 'pool' OR f."slug" LIKE '%pool%'));--> statement-breakpoint
INSERT INTO "facilities" ("property_id", "slug", "name", "icon", "summary", "sort_order")
SELECT p."id", 'housekeeping', 'Housekeeping', 'sparkle', 'Your apartment is serviced daily, with an evening turndown service.', 1 FROM "properties" p
WHERE p."slug" = 'village'
  AND NOT EXISTS (SELECT 1 FROM "facilities" f WHERE f."property_id" = p."id" AND f."slug" = 'housekeeping');--> statement-breakpoint
INSERT INTO "facility_services" ("facility_id", "name", "sort_order")
SELECT f."id", 'Towel service', 0 FROM "facilities" f JOIN "properties" p ON p."id" = f."property_id"
WHERE p."slug" = 'village'
  AND f."id" = (SELECT f2."id" FROM "facilities" f2 WHERE f2."property_id" = p."id" AND (f2."icon" = 'pool' OR f2."slug" LIKE '%pool%') ORDER BY f2."id" LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "facility_services" s WHERE s."facility_id" = f."id");--> statement-breakpoint
INSERT INTO "facility_services" ("facility_id", "name", "sort_order")
SELECT f."id", v.name, v.ord FROM "facilities" f JOIN "properties" p ON p."id" = f."property_id"
CROSS JOIN (VALUES ('Cleaning', 0), ('Dental kit', 1), ('Sewing kit', 2)) AS v(name, ord)
WHERE p."slug" = 'village' AND f."slug" = 'housekeeping'
  AND NOT EXISTS (SELECT 1 FROM "facility_services" s WHERE s."facility_id" = f."id");
