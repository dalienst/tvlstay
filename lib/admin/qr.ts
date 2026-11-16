import { headers } from "next/headers";
import QRCode from "qrcode";

/** The guide's public address: APP_URL if set, otherwise the address this admin page was opened on. */
export async function publicOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1f1615", light: "#ffffff" } });
}
