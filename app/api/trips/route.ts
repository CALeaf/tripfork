import { listTrips, removeTrip, saveTrip } from "@/db";
import type { TripDocument } from "@/lib/trip-types";

export const runtime = "edge";

function validToken(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value);
}

export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get("owner");
  if (!validToken(owner)) return Response.json({ error: "Invalid device id." }, { status: 400 });
  const { env } = await import("cloudflare:workers");
  const trips = await listTrips(env.DB, owner!);
  return Response.json({ trips });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!validToken(body?.owner) || !body?.trip || typeof body.trip !== "object") {
    return Response.json({ error: "Invalid trip data." }, { status: 400 });
  }
  const trip = body.trip as TripDocument;
  if (!validToken(trip.id) || typeof trip.title !== "string" || !Array.isArray(trip.branches)) {
    return Response.json({ error: "Invalid trip document." }, { status: 400 });
  }
  const { env } = await import("cloudflare:workers");
  const saved = await saveTrip(env.DB, body.owner, trip);
  return Response.json({ trip: saved });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  if (!validToken(body?.owner) || !validToken(body?.id)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { env } = await import("cloudflare:workers");
  await removeTrip(env.DB, body.owner, body.id);
  return new Response(null, { status: 204 });
}
