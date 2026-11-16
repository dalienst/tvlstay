import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tamarind Guest Guide", template: "%s · Tamarind" },
  description: "Your in-room guide: dining, menus, facilities and everything you need during your stay.",
  // Guest guides are reached by QR code, not search.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#821124",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
