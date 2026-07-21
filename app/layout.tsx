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
    title: "TripFork — Plan it. Publish it. Fork it.",
    description:
      "Compare complete itineraries, publish the route you actually traveled, and fork any guide into a trip that fits you.",
    openGraph: {
      title: "TripFork",
      description: "Plan it. Publish it. Fork it.",
      type: "website",
      images: [{ url: "/og-community.png", width: 1729, height: 910, alt: "TripFork routes becoming a published, forkable travel guide" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "TripFork",
      description: "Plan it. Publish it. Fork it.",
      images: ["/og-community.png"],
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
