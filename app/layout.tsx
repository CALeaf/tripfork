import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "TripFork — Compare every way your trip could go",
    description:
      "An uncertainty-aware travel planner for comparing complete itineraries, tradeoffs, and what-if branches.",
    openGraph: {
      title: "TripFork",
      description: "Compare every way your trip could go.",
      type: "website",
      images: [{ url: "/og.png", width: 1730, height: 909, alt: "TripFork itinerary branches" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "TripFork",
      description: "Compare every way your trip could go.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
