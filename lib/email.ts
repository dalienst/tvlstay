// Sends email through Resend (https://resend.com), for STAFF ONLY: request alerts and
// password reset links. Nothing here emails guests, and nothing should: guest messages
// (pre-arrival, confirmations) are a separate, consented feature for later.
//
// Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend, e.g.
// "Tamarind Guest Guide <guide@tamarind.co.ke>"). Without them, emails are skipped and
// logged, so local development works with no setup.

export type EmailResult = { ok: true; id?: string } | { ok: false; skipped?: boolean; error: string };

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** "a@x.com, b@x.com; c@x.com" -> valid, de-duplicated addresses. */
export function emailList(...lists: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const l of lists) for (const e of (l ?? "").split(/[,;\s]+/)) if (EMAIL_RE.test(e)) out.add(e.toLowerCase());
  return [...out];
}

export const isEmailList = (v: string) => v.split(/[,;\s]+/).filter(Boolean).every((e) => EMAIL_RE.test(e));

export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple branded email: a heading, lines of text, and an optional button. */
function render(heading: string, lines: string[], button?: { label: string; url: string }) {
  const text = [heading, "", ...lines, ...(button ? ["", `${button.label}: ${button.url}`] : [])].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#faf6f0;font-family:Arial,Helvetica,sans-serif;color:#1f1615">
<div style="max-width:520px;margin:0 auto;padding:24px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#821124">Tamarind guest guide</p>
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:normal">${esc(heading)}</h1>
${lines.map((l) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;white-space:pre-line">${esc(l)}</p>`).join("")}
${button ? `<p style="margin:20px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#821124;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">${esc(button.label)}</a></p>` : ""}
<p style="margin:24px 0 0;font-size:12px;color:#78716c">Sent to Tamarind staff by the guest guide admin.</p>
</div></body></html>`;
  return { text, html };
}

export async function sendStaffEmail(opts: {
  to: string[];
  subject: string;
  heading: string;
  lines: string[];
  button?: { label: string; url: string };
  idempotencyKey?: string;
}): Promise<EmailResult> {
  const to = emailList(opts.to.join(","));
  if (!to.length) return { ok: false, skipped: true, error: "No staff email address to send to." };
  if (!emailConfigured()) {
    console.info(`[email skipped: RESEND_API_KEY/EMAIL_FROM not set] to=${to.join(",")} subject="${opts.subject}"`);
    return { ok: false, skipped: true, error: "Email isn't set up (RESEND_API_KEY and EMAIL_FROM)." };
  }
  const { text, html } = render(opts.heading, opts.lines, opts.button);
  try {
    // RESEND_API_BASE is only for local testing against a stand-in server.
    const res = await fetch(`${process.env.RESEND_API_BASE ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: opts.subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error("[email] Resend refused:", res.status, json.message);
      return { ok: false, error: json.message ?? `Resend error ${res.status}` };
    }
    return { ok: true, id: json.id };
  } catch (err) {
    console.error("[email] failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

/** The admin's public address for links in emails. In production only APP_URL is trusted. */
export function appUrl(fallbackOrigin?: string) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production" && fallbackOrigin) return fallbackOrigin;
  return null;
}
