import { getDb } from "@/lib/db/db";
import { auditLogs } from "@/lib/db/schema";

/** Records who changed what. Never throws: a failed log write must not block the change. */
export async function audit(user: { id: string; email: string } | null, action: string, details?: string) {
  try {
    await getDb()
      .insert(auditLogs)
      .values({ userId: user?.id ?? null, userEmail: user?.email ?? null, action, details: details ?? null });
  } catch (err) {
    console.error("[audit] failed to write", action, err);
  }
}
