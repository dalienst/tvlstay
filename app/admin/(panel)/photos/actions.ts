"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { media } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";
import { audit } from "@/lib/audit";
import { scopeFor } from "@/lib/admin/scope";
import { back, int } from "@/lib/admin/form";
import { photoUsage } from "@/lib/admin/photo-usage";

export async function deletePhoto(form: FormData) {
  const user = await requireUser({ roles: ["super_admin", "property_admin", "outlet_manager"] });
  const id = int(form, "id")!;
  const [row] = await getDb().select({ id: media.id, propertyId: media.propertyId, filename: media.filename }).from(media).where(eq(media.id, id));
  if (!row) back("/admin/photos", "That photo was already deleted.");
  const scope = await scopeFor(user);
  if (!scope.all && row.propertyId !== scope.propertyId) back("/admin/photos", "You can only delete your property's photos.", "error");
  const used = await photoUsage(`/media/${id}`);
  if (used.length) back("/admin/photos", `That photo is still in use (${used.join("; ")}). Replace it there first.`, "error");
  await getDb().delete(media).where(eq(media.id, id));
  await audit(user, "media_deleted", `${row.filename} (/media/${id})`);
  back("/admin/photos", "Photo deleted.");
}
