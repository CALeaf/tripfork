import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TripDocument, TripInput } from "@/lib/trip-types";
import type { Locale } from "@/lib/i18n";

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
  transportMode: z.string(),
  transitHours: z.number(),
  driveHours: z.number(),
  luggageFlexibility: z.enum(["Low", "Medium", "High"]),
  bookingComplexity: z.enum(["Low", "Medium", "High"]),
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
  const readArray = (key: string) =>
    Array.isArray(input[key])
      ? input[key].filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 5)
      : [];
  const transportModes = readArray("transportModes");
  const uncertainty = read("uncertainty") ||
    (transportModes.length > 1
      ? `Choose between ${transportModes.join(" and ")}`
      : "Final route choice");
  const normalized = {
    title: read("title"),
    destination: read("destination"),
    dates: read("dates"),
    travelers: read("travelers"),
    budget: read("budget"),
    origin: read("origin"),
    notes: read("notes"),
    places: read("places"),
    mustHaves: read("mustHaves"),
    fixedBookings: read("fixedBookings"),
    lockedItems: read("lockedItems"),
    movableItems: read("movableItems"),
    optionalItems: read("optionalItems"),
    transportModes: transportModes.length ? transportModes : ["Drive my car", "Fly + rental car"],
    uncertainty,
    decisionDate: read("decisionDate"),
    constraints: read("constraints"),
  };
  if (normalized.destination.length < 2 || normalized.notes.length < 20) {
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
          transportMode: "Fly + rental car",
          transitHours: 18,
          driveHours: 18,
          luggageFlexibility: "Medium",
          bookingComplexity: "Medium",
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
          transportMode: "Fly + rental car",
          transitHours: 21,
          driveHours: 21,
          luggageFlexibility: "Medium",
          bookingComplexity: "High",
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
          transportMode: "Fly + rental car",
          transitHours: 15,
          driveHours: 15,
          luggageFlexibility: "Medium",
          bookingComplexity: "Low",
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

  const transportProfiles = input.transportModes.slice(0, 3).map((mode, index) => {
    const normalizedMode = mode.toLowerCase();
    const isDrive = normalizedMode.includes("drive");
    const isRental = normalizedMode.includes("rental");
    const isTransit = normalizedMode.includes("transit");
    const isTrain = normalizedMode.includes("train");
    return {
      id: `transport-${index + 1}`,
      name: mode,
      subtitle: isDrive
        ? "Maximum route and luggage freedom"
        : isRental
          ? "Recover long-haul time without losing the road trip"
          : isTransit
            ? "No driving, with more schedule constraints"
            : isTrain
              ? "A slower transfer that can double as rest time"
              : "TripFork’s balanced transport mix",
      days: 6,
      cost: isDrive ? 1800 : isRental ? 2500 : isTransit ? 2200 : isTrain ? 2000 : 2300,
      transportMode: mode,
      transitHours: isDrive ? 28 : isRental ? 18 : isTransit ? 20 : isTrain ? 32 : 20,
      driveHours: isDrive ? 28 : isRental ? 12 : isTransit ? 0 : isTrain ? 4 : 14,
      luggageFlexibility: (isDrive ? "High" : isRental ? "Medium" : "Low") as "Low" | "Medium" | "High",
      bookingComplexity: (isDrive ? "Low" : isRental ? "High" : "Medium") as "Low" | "Medium" | "High",
      fatigue: isDrive ? 8 : isRental ? 6 : isTransit ? 5 : isTrain ? 5 : 6,
      experienceScore: isDrive ? 8 : isRental ? 9 : isTransit ? 7 : isTrain ? 7 : 9,
      flexibility: (isDrive ? "High" : isRental ? "Medium" : "Low") as "Low" | "Medium" | "High",
      summary: isDrive
        ? "Keeps the existing plan closest to its current shape and makes spontaneous stops easiest."
        : isRental
          ? "Uses flights for the longest transfer, then keeps a car for the destination loop."
          : "Removes most driving, but the route must follow timetables and transfer points.",
      changes: isDrive
        ? ["Keep the baseline route", "Carry luggage without airline limits"]
        : isRental
          ? ["Replace the longest drive with a flight", "Pick up a rental car at the destination"]
          : ["Cluster places around transit hubs", "Move or drop stops that require a car"],
      tradeoffs: isDrive
        ? ["Long driving days", "Fuel and parking", "Driver fatigue"]
        : isRental
          ? ["Flights and rental cost", "Airport and pickup time", "More bookings"]
          : ["Spontaneous detours", "Luggage freedom", "Remote stops"],
      timeline: [
        { day: "Baseline", title: input.notes.slice(0, 72), detail: `Reworked around ${mode}` },
        { day: "Key stops", title: input.places || input.destination, detail: "Locked items stay; movable and optional items absorb the tradeoffs" },
      ],
    };
  });
  const firstBranch = transportProfiles[0];
  const secondBranch = transportProfiles[1] ?? firstBranch;
  return {
    title: input.title || `${input.destination}: compare the forks`,
    destination: input.destination,
    dateSummary: input.dates || "Dates not set",
    travelers: input.travelers || "Travelers not set",
    budget: input.budget || "Budget not set",
    decision: {
      name: input.uncertainty,
      question: input.transportModes.length > 1
        ? `Which transport tradeoff works better: ${input.transportModes.join(" vs ")}?`
        : `What should change when “${input.uncertainty}” is resolved?`,
      decisionDate: input.decisionDate || "Decision date not set",
      positiveLabel: firstBranch.name,
      negativeLabel: secondBranch.name,
    },
    recommendations: {
      pending: {
        branchId: secondBranch.id,
        title: `Compare ${firstBranch.name} with ${secondBranch.name} before booking.`,
        rationale: "Use door-to-door time and full trip cost—not only ticket price or driving time—to make the transport choice.",
        actions: ["Check door-to-door travel time", "Price fuel, parking, flights, and rental together"],
      },
      positive: {
        branchId: firstBranch.id,
        title: `Use ${firstBranch.name}.`,
        rationale: "This branch preserves the supplied baseline and locked items while making its transport tradeoffs explicit.",
        actions: ["Verify the full transport cost", "Confirm the locked bookings", "Release the unused alternative"],
      },
      negative: {
        branchId: secondBranch.id,
        title: `Use ${secondBranch.name}.`,
        rationale: "This branch buys back travel time or fatigue while showing exactly what changes from the existing plan.",
        actions: ["Book the long-haul transport", "Confirm local mobility", "Release the unused alternative"],
      },
    },
    branches: transportProfiles,
    checklist: [
      { label: "Check every free-cancellation deadline", dueDate: "Today", kind: "check" },
      { label: "Hold the refundable option", dueDate: input.decisionDate || "Before cutoff", kind: "book" },
      { label: "Resolve the uncertain event", dueDate: input.decisionDate || "Decision day", kind: "decide" },
    ],
  };
}

function demoTripZh(input: TripInput): z.infer<typeof GeneratedTrip> {
  const modeNames: Record<string, string> = {
    "Drive my car": "自驾",
    "Fly + rental car": "飞机 + 租车",
    "Fly + public transit": "飞机 + 公共交通",
    Train: "火车",
    "Let TripFork suggest": "TripFork 推荐的组合交通",
  };
  const profiles = input.transportModes.slice(0, 3).map((mode, index) => {
    const normalizedMode = mode.toLowerCase();
    const isDrive = normalizedMode.includes("drive");
    const isRental = normalizedMode.includes("rental");
    const isTransit = normalizedMode.includes("transit");
    const isTrain = normalizedMode.includes("train");
    const displayMode = modeNames[mode] ?? mode;
    return {
      id: `transport-${index + 1}`,
      name: displayMode,
      subtitle: isDrive
        ? "路线和行李自由度最高"
        : isRental
          ? "省下长途时间，同时保留目的地自驾体验"
          : isTransit
            ? "不用开车，但需要配合班次"
            : isTrain
              ? "移动更慢，但途中可以休息"
              : "兼顾时间、花销和体验的交通组合",
      days: 6,
      cost: isDrive ? 1800 : isRental ? 2500 : isTransit ? 2200 : isTrain ? 2000 : 2300,
      transportMode: displayMode,
      transitHours: isDrive ? 28 : isRental ? 18 : isTransit ? 20 : isTrain ? 32 : 20,
      driveHours: isDrive ? 28 : isRental ? 12 : isTransit ? 0 : isTrain ? 4 : 14,
      luggageFlexibility: (isDrive ? "High" : isRental ? "Medium" : "Low") as "Low" | "Medium" | "High",
      bookingComplexity: (isDrive ? "Low" : isRental ? "High" : "Medium") as "Low" | "Medium" | "High",
      fatigue: isDrive ? 8 : isRental ? 6 : isTransit ? 5 : isTrain ? 5 : 6,
      experienceScore: isDrive ? 8 : isRental ? 9 : isTransit ? 7 : isTrain ? 7 : 9,
      flexibility: (isDrive ? "High" : isRental ? "Medium" : "Low") as "Low" | "Medium" | "High",
      summary: isDrive
        ? "最大程度保留已有路线，也最容易临时增加停靠点。"
        : isRental
          ? "最长的一段改乘飞机，落地后继续租车完成环线。"
          : "减少大部分驾驶，但路线需要围绕班次和换乘点安排。",
      changes: isDrive
        ? ["保留基准路线", "行李不受航空限制"]
        : isRental
          ? ["用飞机替代最长的一段驾驶", "在目的地机场领取租车"]
          : ["把地点集中在交通枢纽附近", "调整或放弃必须开车才能到达的停靠点"],
      tradeoffs: isDrive
        ? ["长时间驾驶", "油费和停车费", "驾驶疲劳"]
        : isRental
          ? ["机票和租车花销", "机场和取车时间", "更多预订环节"]
          : ["临时绕行自由", "行李自由度", "偏远地点"],
      timeline: [
        { day: "基准计划", title: input.notes.slice(0, 72), detail: `围绕“${displayMode}”重新整理` },
        { day: "主要地点", title: input.places || input.destination, detail: "固定项目保留；可移动和可舍弃项目承担取舍" },
      ],
    };
  });
  const first = profiles[0];
  const second = profiles[1] ?? first;
  return {
    title: input.title || `${input.destination}：比较每一种走法`,
    destination: input.destination,
    dateSummary: input.dates || "日期未确定",
    travelers: input.travelers || "人数未确定",
    budget: input.budget || "预算未确定",
    decision: {
      name: input.uncertainty || "最终路线选择",
      question: input.transportModes.length > 1
        ? `哪一种交通取舍更合适：${profiles.map((profile) => profile.transportMode).join(" vs ")}？`
        : `“${input.uncertainty || "最终路线"}”确定后，计划应该怎么调整？`,
      decisionDate: input.decisionDate || "决策日期未确定",
      positiveLabel: first.name,
      negativeLabel: second.name,
    },
    recommendations: {
      pending: {
        branchId: second.id,
        title: `预订前先完整比较“${first.name}”和“${second.name}”。`,
        rationale: "不要只看票价或驾驶时间，要一起比较门到门时间和整趟旅行的总花销。",
        actions: ["核对门到门交通时间", "把油费、停车、机票和租车放在一起计算"],
      },
      positive: {
        branchId: first.id,
        title: `选择“${first.name}”。`,
        rationale: "这个方案尽量保留原始计划和固定项目，同时把交通方式带来的取舍说清楚。",
        actions: ["核实完整交通花销", "确认固定预订", "释放未采用的备选方案"],
      },
      negative: {
        branchId: second.id,
        title: `选择“${second.name}”。`,
        rationale: "这个方案用花销换回时间或体力，并明确展示与原计划相比需要改动什么。",
        actions: ["预订长途交通", "确认目的地内的移动方式", "释放未采用的备选方案"],
      },
    },
    branches: profiles,
    checklist: [
      { label: "核对所有免费取消截止时间", dueDate: "今天", kind: "check" },
      { label: "锁定可退款的备选方案", dueDate: input.decisionDate || "截止日前", kind: "book" },
      { label: "确定最终变量结果", dueDate: input.decisionDate || "决策日", kind: "decide" },
    ],
  };
}

function toDocument(generated: z.infer<typeof GeneratedTrip>, input: TripInput): TripDocument {
  return {
    ...generated,
    id: crypto.randomUUID(),
    sourceNotes: [input.notes, input.places, input.mustHaves, input.fixedBookings, input.lockedItems, input.movableItems, input.optionalItems, input.constraints]
      .filter(Boolean)
      .join("\n\n"),
    inputSummary: {
      origin: input.origin,
      existingPlan: input.notes,
      places: input.places,
      lockedItems: [input.fixedBookings, input.lockedItems].filter(Boolean).join("; "),
      movableItems: input.movableItems,
      optionalItems: input.optionalItems,
      transportModes: input.transportModes,
    },
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
  const locale: Locale = body?.locale === "zh" ? "zh" : "en";
  const input = normalizeInput(body?.trip);
  if (!input) {
    return Response.json(
      { error: locale === "zh" ? "请填写目的地和已有行程，并选择要比较的交通方式或不确定变量。" : "Add a destination and the itinerary you already have. Choose transport modes or add an uncertainty to compare." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ trip: toDocument(locale === "zh" ? demoTripZh(input) : demoTrip(input), input), source: "demo" });
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
            `You are TripFork, a travel comparison engine. Treat the user's existing plan as the baseline, not disposable notes. Never move locked items. Move only movable items and drop only optional items. When 2–3 transport modes are requested, create a distinct complete branch for each one. Compare door-to-door transit time, driving time, full-trip cost (fuel, parking, flights, rental, local transit), fatigue, luggage freedom, booking complexity, route flexibility, and which supplied places no longer fit. Never claim live prices or availability; costs are labeled estimates. Preserve must-haves where feasible and state honest tradeoffs when they cannot all fit. Every pending/positive/negative recommendation must reference an existing branch id. Produce concrete next actions, not generic travel advice. Return every user-facing string in ${locale === "zh" ? "Simplified Chinese" : "English"}.`,
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
    return Response.json({ error: locale === "zh" ? "实时对比失败，请稍后再试。" : "The live comparison failed. Please try again." }, { status: 502 });
  }
}
