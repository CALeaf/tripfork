import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const runtime = "edge";

const TimelineDay = z.object({
  day: z.string(),
  title: z.string(),
  detail: z.string(),
});

const Branch = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string(),
  days: z.number(),
  cost: z.number(),
  driveHours: z.number(),
  fatigue: z.number().min(1).max(10),
  experienceScore: z.number().min(1).max(10),
  flexibility: z.enum(["Low", "Medium", "High"]),
  summary: z.string(),
  changes: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  timeline: z.array(TimelineDay),
});

const TripComparison = z.object({
  title: z.string(),
  decision: z.string(),
  recommendation: z.string(),
  branches: z.array(Branch).min(2).max(3),
});

function demoComparison(trip: string): z.infer<typeof TripComparison> {
  const isHawaii = /hawai|big island|volcano|mauna|夏威夷|火山/i.test(trip);

  if (isHawaii) {
    return {
      title: "Big Island: eruption or no eruption",
      decision: "Volcano activity and summit weather determine the middle of the trip.",
      recommendation:
        "Keep the Kona and Hilo stays fixed, but protect one flexible Volcano night. If an eruption starts, activate the return-to-park branch.",
      branches: [
        {
          id: "clear-skies",
          name: "Clear skies first",
          subtitle: "Use the best weather window for Mauna Kea",
          days: 7,
          cost: 3950,
          driveHours: 18,
          fatigue: 7,
          experienceScore: 9,
          flexibility: "Medium",
          summary: "Prioritizes Mauna Kea, manta rays, and safer snorkeling while weather is favorable.",
          changes: ["Move Mauna Kea to the first clear evening", "Keep Kahaluʻu as the safe snorkel base"],
          tradeoffs: ["More backtracking", "A later Volcano visit"],
          timeline: [
            { day: "Day 1–2", title: "Kona coast", detail: "Manta ray dive and protected snorkeling" },
            { day: "Day 3–4", title: "Volcano + Mauna Kea", detail: "Use the clearest forecast window" },
            { day: "Day 5–7", title: "Hilo coast", detail: "Waterfalls, beaches, and eruption fallback" },
          ],
        },
        {
          id: "eruption",
          name: "Eruption activated",
          subtitle: "Drop optional Hilo stops and return to the park",
          days: 7,
          cost: 4100,
          driveHours: 21,
          fatigue: 8,
          experienceScore: 10,
          flexibility: "High",
          summary: "Treats the eruption as the must-have live event and protects everything already reserved.",
          changes: ["Replace the Hilo afternoon", "Return to Volcano National Park immediately"],
          tradeoffs: ["Rainbow Falls or market time", "Three extra driving hours"],
          timeline: [
            { day: "Day 1–5", title: "Keep core route", detail: "Kona → Volcano → Hilo" },
            { day: "Day 6", title: "Return to Volcano", detail: "Activate only if eruption is visible" },
            { day: "Day 7", title: "North coast to Kona", detail: "Keep the flight and scenic return" },
          ],
        },
      ],
    };
  }

  return {
    title: "Your trip, compared three ways",
    decision: "Balance the must-have experience against time, cost, and fatigue.",
    recommendation:
      "Protect the fixed bookings, keep one flexible night, and choose the balanced branch unless the uncertain event becomes available.",
    branches: [
      {
        id: "original",
        name: "Keep the original",
        subtitle: "Lowest cost and fewest booking changes",
        days: 6,
        cost: 1800,
        driveHours: 28,
        fatigue: 8,
        experienceScore: 7,
        flexibility: "Low",
        summary: "Preserves the current route and reservations.",
        changes: ["No booking changes"],
        tradeoffs: ["Misses the uncertain must-have", "Less recovery time"],
        timeline: [{ day: "Trip", title: "Original route", detail: "All current reservations remain" }],
      },
      {
        id: "balanced",
        name: "Protect optionality",
        subtitle: "The best balance while the outcome is pending",
        days: 7,
        cost: 2200,
        driveHours: 24,
        fatigue: 6,
        experienceScore: 9,
        flexibility: "High",
        summary: "Adds a flexible buffer that can absorb the uncertain event.",
        changes: ["Add one refundable night", "Move one optional stop"],
        tradeoffs: ["One more day", "Moderately higher cost"],
        timeline: [{ day: "Trip", title: "Flexible route", detail: "One day remains uncommitted" }],
      },
      {
        id: "compressed",
        name: "Make it fit",
        subtitle: "Keep the dates and recover time elsewhere",
        days: 6,
        cost: 2500,
        driveHours: 16,
        fatigue: 7,
        experienceScore: 9,
        flexibility: "Medium",
        summary: "Spends more to remove transit and preserve the must-have.",
        changes: ["Replace the longest transfer", "Drop one optional stop"],
        tradeoffs: ["Higher transport cost", "Less spontaneous time"],
        timeline: [{ day: "Trip", title: "Compressed route", detail: "Transit is exchanged for experience time" }],
      },
    ],
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const trip = typeof body?.trip === "string" ? body.trip.trim() : "";

  if (trip.length < 30) {
    return Response.json(
      { error: "Please describe the trip and at least one constraint or uncertainty." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ comparison: demoComparison(trip), source: "demo" });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      reasoning: { effort: "medium" },
      input: [
        {
          role: "system",
          content:
            "You are TripFork, an uncertainty-aware travel decision engine. Build 2–3 complete, meaningfully different itinerary branches. Preserve fixed commitments. Treat must-haves, optional stops, constraints, and uncertain events separately. Compare real tradeoffs; never pretend every goal fits. Costs may be reasonable estimates when exact prices are absent. Keep the output concise and decision-oriented.",
        },
        {
          role: "user",
          content: `Turn this travel situation into comparable branches:\n\n${trip}`,
        },
      ],
      text: {
        format: zodTextFormat(TripComparison, "trip_comparison"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("The model did not return a comparison.");
    }

    return Response.json({
      comparison: response.output_parsed,
      source: "openai",
    });
  } catch (error) {
    console.error("TripFork comparison failed", error);
    return Response.json(
      {
        error: "The live comparison failed. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
