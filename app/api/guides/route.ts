import { z } from "zod";
import { getGuide, listGuides, saveGuide } from "@/db";
import { featuredPublishedGuides, findFeaturedGuide } from "@/lib/featured-guides";
import type { PublishedGuide } from "@/lib/guide-types";

export const runtime = "edge";

const text = (max: number) => z.string().trim().min(1).max(max);

const routePoint = z.object({ label: text(80), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const timelineDay = z.object({ day: text(40), title: text(160), detail: text(500) });
const branch = z.object({
  id: text(80), name: text(160), subtitle: text(240), days: z.number().min(1).max(120), cost: z.number().min(0).max(1_000_000),
  driveHours: z.number().min(0).max(1000), transportMode: z.string().max(120).optional(), transitHours: z.number().min(0).max(1000).optional(),
  luggageFlexibility: z.enum(["Low", "Medium", "High"]).optional(), bookingComplexity: z.enum(["Low", "Medium", "High"]).optional(),
  fatigue: z.number().min(1).max(10), experienceScore: z.number().min(1).max(10), flexibility: z.enum(["Low", "Medium", "High"]),
  summary: text(800), changes: z.array(text(240)).max(12), tradeoffs: z.array(text(240)).max(12), timeline: z.array(timelineDay).min(1).max(40),
  routePoints: z.array(routePoint).max(20).optional(),
});

const tripInput = z.object({
  title: z.string().max(160), destination: text(160), dates: z.string().max(120), travelers: z.string().max(80), budget: z.string().max(80), origin: z.string().max(160),
  notes: text(8000), places: z.string().max(2000), mustHaves: z.string().max(2000), fixedBookings: z.string().max(2000), lockedItems: z.string().max(2000),
  movableItems: z.string().max(2000), optionalItems: z.string().max(2000), transportModes: z.array(text(120)).min(1).max(5), uncertainty: z.string().max(1000),
  decisionDate: z.string().max(120), constraints: z.string().max(2000),
});

const guideInput = z.object({
  title: text(160), destination: text(160), author: text(80), tripDate: text(80), duration: text(80), actualCost: text(80), summary: text(600), story: text(5000), bestFor: text(500),
  highlights: z.array(text(240)).min(1).max(12), tips: z.array(text(500)).min(1).max(12),
  sourceUrl: z.string().url().max(500).refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL.").optional().or(z.literal("")), branch, forkInput: tripInput,
});

function validToken(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value);
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!validToken(id)) return Response.json({ error: "Invalid guide id." }, { status: 400 });
    const featured = findFeaturedGuide(id);
    if (featured) return Response.json({ guide: featured });
    const { env } = await import("cloudflare:workers");
    const guide = await getGuide(env.DB, id);
    return guide ? Response.json({ guide }) : Response.json({ error: "Guide not found." }, { status: 404 });
  }
  const { env } = await import("cloudflare:workers");
  const community = await listGuides(env.DB);
  return Response.json({ guides: [...featuredPublishedGuides, ...community] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!validToken(body?.owner)) return Response.json({ error: "Invalid device id." }, { status: 400 });
  const parsed = guideInput.safeParse(body?.guide);
  if (!parsed.success) return Response.json({ error: "Complete the required guide details before publishing." }, { status: 400 });
  const now = new Date().toISOString();
  const guide: PublishedGuide = {
    ...parsed.data,
    sourceUrl: parsed.data.sourceUrl || undefined,
    id: `guide-${crypto.randomUUID()}`,
    publishedAt: now,
  };
  const { env } = await import("cloudflare:workers");
  return Response.json({ guide: await saveGuide(env.DB, body.owner, guide) }, { status: 201 });
}
