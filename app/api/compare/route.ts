import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TripDocument, TripInput } from "@/lib/trip-types";

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

const Recommendation = z.object({
  branchId: z.string(),
  title: z.string(),
  rationale: z.string(),
  actions: z.array(z.string()),
});

const GeneratedTrip = z.object({
  title: z.string(),
  destination: z.string(),
  dateSummary: z.string(),
  travelers: z.string(),
  budget: z.string(),
  decision: z.object({
    name: z.string(),
    question: z.string(),
    decisionDate: z.string(),
    positiveLabel: z.string(),
    negativeLabel: z.string(),
  }),
  recommendations: z.object({
    pending: Recommendation,
    positive: Recommendation,
    negative: Recommendation,
  }),
  branches: z.array(Branch).min(2).max(3),
  checklist: z.array(
    z.object({
      label: z.string(),
      dueDate: z.string(),
      kind: z.enum(["book", "cancel", "check", "decide"]),
    }),
  ),
});

function normalizeInput(value: unknown): TripInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const read = (key: string) => (typeof input[key] === "string" ? input[key].trim() : "");
  const normalized = {
    title: read("title"),
    destination: read("destination"),
    dates: read("dates"),
    travelers: read("travelers"),
    budget: read("budget"),
    notes: read("notes"),
    mustHaves: read("mustHaves"),
    fixedBookings: read("fixedBookings"),
    uncertainty: read("uncertainty"),
    decisionDate: read("decisionDate"),
    constraints: read("constraints"),
  };
  if (normalized.destination.length < 2 || normalized.notes.length < 20 || normalized.uncertainty.length < 3) {
    return null;
  }
  return normalized;
}

function demoTrip(input: TripInput): z.infer<typeof GeneratedTrip> {
  const isHawaii = /hawai|big island|volcano|mauna|夏威夷|火山/i.test(
    `${input.destination} ${input.notes} ${input.uncertainty}`,
  );
  if (isHawaii) {
    return {
      title: input.title || "Big Island: three ways the week could unfold",
      destination: input.destination || "Hawaii Big Island",
      dateSummary: input.dates || "7 days",
      travelers: input.travelers || "2 travelers",
      budget: input.budget || "$4,000",
      decision: {
        name: "Volcano and summit conditions",
        question: "Are eruption viewing and Mauna Kea conditions favorable?",
        decisionDate: input.decisionDate || "Check 48 hours before",
        positiveLabel: "Favorable",
        negativeLabel: "Not favorable",
      },
      recommendations: {
        pending: {
          branchId: "weather-first",
          title: "Keep both coasts fixed and leave one evening movable.",
          rationale: "A flexible evening is enough to use the best summit or eruption window without rebuilding the whole trip.",
          actions: ["Keep one evening unbooked", "Check park alerts and summit forecast 48 hours before"],
        },
        positive: {
          branchId: "eruption-active",
          title: "Activate the live-event branch.",
          rationale: "Move optional Hilo sightseeing and use the favorable window for the rare experience.",
          actions: ["Confirm park access", "Pack layers and lights", "Move the optional Hilo afternoon"],
        },
        negative: {
          branchId: "coast-first",
          title: "Use the lower-risk coast plan.",
          rationale: "Protected snorkeling, manta rays and waterfalls still deliver the trip without chasing unsafe conditions.",
          actions: ["Confirm the manta operator", "Use the protected snorkel beach", "Release the flexible Volcano night"],
        },
      },
      branches: [
        {
          id: "weather-first",
          name: "Weather-window plan",
          subtitle: "Move the summit night, not the whole route",
          days: 7,
          cost: 3950,
          driveHours: 18,
          fatigue: 7,
          experienceScore: 9,
          flexibility: "High",
          summary: "Keeps Kona and Hilo fixed while one evening follows the best forecast.",
          changes: ["Leave one evening movable", "Use the clearest window for Mauna Kea"],
          tradeoffs: ["One unplanned evening", "Possible backtracking"],
          timeline: [
            { day: "Day 1–2", title: "Kona coast", detail: "Manta rays and protected snorkeling" },
            { day: "Day 3–4", title: "Volcano district", detail: "Park plus movable summit evening" },
            { day: "Day 5–7", title: "Hilo and north coast", detail: "Waterfalls and scenic return" },
          ],
        },
        {
          id: "eruption-active",
          name: "Eruption activated",
          subtitle: "Protect the rare live event",
          days: 7,
          cost: 4100,
          driveHours: 21,
          fatigue: 8,
          experienceScore: 10,
          flexibility: "Medium",
          summary: "Returns to the park during the visible window and drops optional stops.",
          changes: ["Replace the Hilo afternoon", "Return to the park if viewing is open"],
          tradeoffs: ["Rainbow Falls or market time", "Three extra driving hours"],
          timeline: [
            { day: "Day 1–5", title: "Keep the core route", detail: "Kona → Volcano → Hilo" },
            { day: "Day 6", title: "Return to Volcano", detail: "Only if official conditions are favorable" },
            { day: "Day 7", title: "North coast to Kona", detail: "Keep the flight and scenic return" },
          ],
        },
        {
          id: "coast-first",
          name: "Coast-first fallback",
          subtitle: "Lower fatigue when conditions disappoint",
          days: 7,
          cost: 3700,
          driveHours: 15,
          fatigue: 5,
          experienceScore: 8,
          flexibility: "Medium",
          summary: "Avoids chasing conditions and invests the time in beaches and the north coast.",
          changes: ["Skip the second park visit", "Add a slower north-coast day"],
          tradeoffs: ["No eruption viewing", "No summit sunset"],
          timeline: [
            { day: "Day 1–3", title: "Kona", detail: "Manta rays and gentle water activities" },
            { day: "Day 4–5", title: "Volcano and Hilo", detail: "Daylight park visit and waterfalls" },
            { day: "Day 6–7", title: "North coast", detail: "Waimea and scenic beaches" },
          ],
        },
      ],
      checklist: [
        { label: "Confirm manta ray operator and cancellation terms", dueDate: "Before free cancellation", kind: "check" },
        { label: "Check NPS alerts and summit forecast", dueDate: "48 hours before", kind: "decide" },
        { label: "Release the unused flexible booking", dueDate: "Before cutoff", kind: "cancel" },
      ],
    };
  }

  return {
    title: input.title || `${input.destination}: compare the forks`,
    destination: input.destination,
    dateSummary: input.dates || "Dates not set",
    travelers: input.travelers || "Travelers not set",
    budget: input.budget || "Budget not set",
    decision: {
      name: input.uncertainty,
      question: `What should change when “${input.uncertainty}” is resolved?`,
      decisionDate: input.decisionDate || "Decision date not set",
      positiveLabel: "Happens",
      negativeLabel: "Doesn’t happen",
    },
    recommendations: {
      pending: {
        branchId: "balanced",
        title: "Protect optionality until the uncertainty resolves.",
        rationale: "Keep fixed bookings and add only the smallest refundable buffer needed to preserve both outcomes.",
        actions: ["Check cancellation deadlines", "Hold one refundable option"],
      },
      positive: {
        branchId: "must-have",
        title: "Activate the must-have branch.",
        rationale: "Trade an optional stop for the uncertain experience while keeping the fixed commitments intact.",
        actions: ["Confirm the uncertain event", "Move the optional stop", "Cancel the unused hold"],
      },
      negative: {
        branchId: "original",
        title: "Return to the efficient base plan.",
        rationale: "There is no longer a reason to pay for flexibility, so keep the lowest-change itinerary.",
        actions: ["Release the flexible hold", "Confirm fixed bookings"],
      },
    },
    branches: [
      {
        id: "original",
        name: "Keep the original",
        subtitle: "Fewest changes and lowest cost",
        days: 6,
        cost: 1800,
        driveHours: 28,
        fatigue: 8,
        experienceScore: 7,
        flexibility: "Low",
        summary: "Preserves the current route and reservations.",
        changes: ["No booking changes"],
        tradeoffs: ["The uncertain must-have", "Recovery time"],
        timeline: [{ day: "Trip", title: "Original route", detail: "All fixed reservations remain" }],
      },
      {
        id: "balanced",
        name: "Protect optionality",
        subtitle: "Best while the outcome is pending",
        days: 7,
        cost: 2200,
        driveHours: 24,
        fatigue: 6,
        experienceScore: 9,
        flexibility: "High",
        summary: "Adds a refundable buffer that can absorb the uncertain event.",
        changes: ["Add one flexible night", "Move one optional stop"],
        tradeoffs: ["One more day", "Moderately higher cost"],
        timeline: [{ day: "Trip", title: "Flexible route", detail: "One day remains movable" }],
      },
      {
        id: "must-have",
        name: "Make the must-have fit",
        subtitle: "Spend more to recover time",
        days: 6,
        cost: 2500,
        driveHours: 16,
        fatigue: 7,
        experienceScore: 9,
        flexibility: "Medium",
        summary: "Replaces the longest transfer and preserves the must-have.",
        changes: ["Replace the longest transfer", "Drop one optional stop"],
        tradeoffs: ["Higher transport cost", "Less spontaneous time"],
        timeline: [{ day: "Trip", title: "Compressed route", detail: "Transit is exchanged for experience time" }],
      },
    ],
    checklist: [
      { label: "Check every free-cancellation deadline", dueDate: "Today", kind: "check" },
      { label: "Hold the refundable option", dueDate: input.decisionDate || "Before cutoff", kind: "book" },
      { label: "Resolve the uncertain event", dueDate: input.decisionDate || "Decision day", kind: "decide" },
    ],
  };
}

function toDocument(generated: z.infer<typeof GeneratedTrip>, input: TripInput): TripDocument {
  return {
    ...generated,
    id: crypto.randomUUID(),
    sourceNotes: [input.notes, input.mustHaves, input.fixedBookings, input.constraints]
      .filter(Boolean)
      .join("\n\n"),
    decision: { ...generated.decision, status: "pending" },
    checklist: generated.checklist.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      done: false,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = normalizeInput(body?.trip);
  if (!input) {
    return Response.json(
      { error: "Add a destination, a rough itinerary, and the uncertainty you need to plan around." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ trip: toDocument(demoTrip(input), input), source: "demo" });
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
            "You are TripFork, an uncertainty-aware travel decision engine. Build 2–3 complete, meaningfully different branches. Preserve fixed commitments. Separate must-haves, optional stops, constraints, and uncertain events. Compare real tradeoffs; never pretend every goal fits. Use the user's currency when known. Costs are clearly reasonable estimates when exact prices are absent. Every pending/positive/negative recommendation must reference a branch id that exists. Produce concrete actions and cancellation checks, not generic travel advice.",
        },
        {
          role: "user",
          content: `Create a decision-ready comparison from this trip:\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
      text: { format: zodTextFormat(GeneratedTrip, "trip_comparison") },
    });
    if (!response.output_parsed) throw new Error("The model did not return a comparison.");
    return Response.json({ trip: toDocument(response.output_parsed, input), source: "openai" });
  } catch (error) {
    console.error("TripFork comparison failed", error);
    return Response.json({ error: "The live comparison failed. Please try again." }, { status: 502 });
  }
}
