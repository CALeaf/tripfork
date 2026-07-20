"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { branchAccents, type DecisionStatus, type TripDocument, type TripInput } from "@/lib/trip-types";
import { sampleHawaiiTrip, sampleHawaiiTripZh, sampleTrip, sampleTripZh } from "@/lib/sample-trip";
import { localeNames, transportCopy, translateComplexity, translateKind, translateLevel, uiCopy, type Locale } from "@/lib/i18n";

function createEmptyInput(locale: Locale): TripInput {
  return {
  title: "",
  destination: "",
  dates: "",
  travelers: locale === "zh" ? "2 人" : "2 travelers",
  budget: "",
  origin: "",
  notes: "",
  places: "",
  mustHaves: "",
  fixedBookings: "",
  lockedItems: "",
  movableItems: "",
  optionalItems: "",
  transportModes: ["Drive my car", "Fly + rental car"],
  uncertainty: "",
  decisionDate: "",
  constraints: "",
  };
}

const canonicalTransport: Record<string, string> = {
  "自驾": "Drive my car",
  "飞机 + 租车": "Fly + rental car",
  "飞机 + 公交": "Fly + public transit",
  "飞机 + 公共交通": "Fly + public transit",
  "火车": "Train",
  "让 TripFork 帮我搭配": "Let TripFork suggest",
  "TripFork 推荐的组合交通": "Let TripFork suggest",
};

function editableInputFromTrip(trip: TripDocument, locale: Locale): TripInput {
  if (trip.originalInput) {
    return {
      ...trip.originalInput,
      transportModes: [...trip.originalInput.transportModes],
    };
  }
  const summary = trip.inputSummary;
  const transportModes = (summary?.transportModes ?? [])
    .map((mode) => canonicalTransport[mode] ?? mode)
    .filter((mode) => transportChoices.includes(mode));
  return {
    ...createEmptyInput(locale),
    title: trip.title,
    destination: trip.destination,
    dates: trip.dateSummary,
    travelers: trip.travelers,
    budget: trip.budget,
    origin: summary?.origin ?? "",
    notes: summary?.existingPlan || trip.sourceNotes,
    places: summary?.places ?? "",
    lockedItems: summary?.lockedItems ?? "",
    movableItems: summary?.movableItems ?? "",
    optionalItems: summary?.optionalItems ?? "",
    transportModes: transportModes.length ? transportModes : createEmptyInput(locale).transportModes,
    uncertainty: trip.decision.name,
    decisionDate: trip.decision.decisionDate,
  };
}

const transportChoices = [
  "Drive my car",
  "Fly + rental car",
  "Fly + public transit",
  "Train",
  "Let TripFork suggest",
];

const levelScore = { Low: 1, Medium: 2, High: 3 } as const;

type PreferenceId = "balanced" | "budget" | "easy" | "time" | "experience";

const preferenceWeights: Record<PreferenceId, Record<string, number>> = {
  balanced: { cost: 0.12, fatigue: 0.12, days: 0.05, transit: 0.07, drive: 0.07, experience: 0.27, luggage: 0.05, booking: 0.08, flexibility: 0.17 },
  budget: { cost: 0.58, fatigue: 0.08, days: 0.05, transit: 0.05, drive: 0.04, experience: 0.08, luggage: 0.04, booking: 0.05, flexibility: 0.03 },
  easy: { cost: 0.05, fatigue: 0.38, days: 0.05, transit: 0.13, drive: 0.18, experience: 0.06, luggage: 0.05, booking: 0.07, flexibility: 0.03 },
  time: { cost: 0.05, fatigue: 0.1, days: 0.3, transit: 0.3, drive: 0.12, experience: 0.05, luggage: 0.02, booking: 0.03, flexibility: 0.03 },
  experience: { cost: 0.04, fatigue: 0.06, days: 0.03, transit: 0.03, drive: 0.03, experience: 0.55, luggage: 0.04, booking: 0.04, flexibility: 0.18 },
};

function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function paceLabel(fatigue: number, locale: Locale) {
  const copy = uiCopy[locale];
  if (fatigue <= 4) return copy.relaxed;
  if (fatigue <= 7) return copy.moderate;
  return copy.tight;
}

function getOwnerId() {
  const key = "tripfork_owner_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function tripMarkdown(
  trip: TripDocument,
  locale: Locale,
  recommendation = trip.recommendations[trip.decision.status],
) {
  const zh = locale === "zh";
  const lines = [
    `# ${trip.title}`,
    "",
    `${trip.destination} · ${trip.dateSummary} · ${trip.travelers} · ${zh ? "预算" : "Budget"} ${trip.budget}`,
    "",
    ...(trip.inputSummary
      ? [
          zh ? "## 原始输入" : "## Starting point",
          "",
          `${zh ? "出发地" : "Origin"}: ${trip.inputSummary.origin || (zh ? "未填写" : "Not specified")}`,
          `${zh ? "交通选项" : "Transport options"}: ${trip.inputSummary.transportModes.join(", ") || (zh ? "未填写" : "Not specified")}`,
          `${zh ? "地点" : "Places supplied"}: ${trip.inputSummary.places || (zh ? "未填写" : "Not specified")}`,
          `${zh ? "必须保留" : "Must keep"}: ${trip.inputSummary.lockedItems || (zh ? "未填写" : "Not specified")}`,
          `${zh ? "可以调整" : "Can move"}: ${trip.inputSummary.movableItems || (zh ? "未填写" : "Not specified")}`,
          `${zh ? "可以舍弃" : "Can skip"}: ${trip.inputSummary.optionalItems || (zh ? "未填写" : "Not specified")}`,
          "",
        ]
      : []),
    `${zh ? "## 当前建议" : "## Current recommendation"}: ${recommendation.title}`,
    "",
    recommendation.rationale,
    "",
    ...recommendation.actions.map((action) => `- [ ] ${action}`),
    "",
    zh ? "## 对比方案" : "## Compared plans",
    "",
  ];
  for (const branch of trip.branches) {
    lines.push(
      `### ${branch.name}${recommendation.branchId === branch.id ? (zh ? " — 推荐" : " — recommended") : ""}`,
      "",
      `${branch.transportMode || (zh ? "组合交通" : "Mixed transport")} · ${branch.days} ${zh ? "天" : "days"} · ${formatMoney(branch.cost, locale)} ${zh ? "预计" : "estimated"} · ${branch.transitHours ?? branch.driveHours}h ${zh ? "总交通" : "total transit"} · ${branch.driveHours}h ${zh ? "驾驶" : "driving"} · ${zh ? "疲劳度" : "fatigue"} ${branch.fatigue}/10`,
      "",
      branch.summary,
      "",
      ...branch.timeline.map((day) => `- **${day.day}: ${day.title}** — ${day.detail}`),
      "",
      `${zh ? "取舍" : "Tradeoffs"}: ${branch.tradeoffs.join(", ")}`,
      "",
    );
  }
  lines.push(zh ? "## 行动清单" : "## Action list", "", ...trip.checklist.map((item) => `- [${item.done ? "x" : " "}] ${item.label} — ${item.dueDate}`));
  return lines.join("\n");
}

export function TripForkApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeTrip, setActiveTrip] = useState<TripDocument>(sampleTrip);
  const [savedTrips, setSavedTrips] = useState<TripDocument[]>([]);
  const [selected, setSelected] = useState<string[]>(sampleTrip.branches.map((branch) => branch.id));
  const [preference, setPreference] = useState<PreferenceId>("balanced");
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [isEditingInputs, setEditingInputs] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripInput, setTripInput] = useState<TripInput>(() => createEmptyInput("en"));
  const [isGenerating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("Showing the sample trip. Create yours when you’re ready.");
  const [isSaving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ownerId = useRef("");
  const copy = uiCopy[locale];
  const localizedSamples = locale === "zh"
    ? [sampleTripZh, sampleHawaiiTripZh]
    : [sampleTrip, sampleHawaiiTrip];
  const activeIsSample = localizedSamples.some((trip) => trip.id === activeTrip.id);
  const preferenceOptions = useMemo(() => [
    { id: "balanced" as const, label: copy.balanced, hint: copy.balancedHint },
    { id: "budget" as const, label: copy.saveMoney, hint: copy.saveMoneyHint },
    { id: "easy" as const, label: copy.takeItEasy, hint: copy.takeItEasyHint },
    { id: "time" as const, label: copy.saveTime, hint: copy.saveTimeHint },
    { id: "experience" as const, label: copy.seeMore, hint: copy.seeMoreHint },
  ], [copy]);

  const recommendation = activeTrip.recommendations[activeTrip.decision.status];
  const comparedBranches = useMemo(
    () => activeTrip.branches.filter((branch) => selected.includes(branch.id)),
    [activeTrip, selected],
  );
  const comparisonRows = useMemo(
    () => [
      {
        label: copy.estimatedCost,
        hint: copy.lowerBetter,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => branch.cost,
        display: (branch: TripDocument["branches"][number]) => formatMoney(branch.cost, locale),
      },
      {
        label: copy.tripPace,
        hint: copy.lowerIntensity,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => branch.fatigue,
        display: (branch: TripDocument["branches"][number]) => `${paceLabel(branch.fatigue, locale)} · ${branch.fatigue}/10`,
      },
      {
        label: copy.daysRequired,
        hint: copy.fewerDays,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => branch.days,
        display: (branch: TripDocument["branches"][number]) => `${branch.days} ${copy.days}`,
      },
      {
        label: copy.doorToDoor,
        hint: copy.totalMovement,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => branch.transitHours ?? branch.driveHours,
        display: (branch: TripDocument["branches"][number]) => `${branch.transitHours ?? branch.driveHours}h`,
      },
      {
        label: copy.drivingTime,
        hint: copy.hoursWheel,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => branch.driveHours,
        display: (branch: TripDocument["branches"][number]) => `${branch.driveHours}h`,
      },
      {
        label: copy.experienceCoverage,
        hint: copy.moreMustHaves,
        direction: "higher" as const,
        score: (branch: TripDocument["branches"][number]) => branch.experienceScore,
        display: (branch: TripDocument["branches"][number]) => `${branch.experienceScore}/10`,
      },
      {
        label: copy.luggageFreedom,
        hint: copy.lessPacking,
        direction: "higher" as const,
        score: (branch: TripDocument["branches"][number]) => levelScore[branch.luggageFlexibility ?? branch.flexibility],
        display: (branch: TripDocument["branches"][number]) => translateLevel(branch.luggageFlexibility ?? branch.flexibility, locale),
      },
      {
        label: copy.bookingSimplicity,
        hint: copy.fewerParts,
        direction: "lower" as const,
        score: (branch: TripDocument["branches"][number]) => levelScore[branch.bookingComplexity ?? "Medium"],
        display: (branch: TripDocument["branches"][number]) => translateComplexity(branch.bookingComplexity ?? "Medium", locale),
      },
      {
        label: copy.routeFlexibility,
        hint: copy.easierChange,
        direction: "higher" as const,
        score: (branch: TripDocument["branches"][number]) => levelScore[branch.flexibility],
        display: (branch: TripDocument["branches"][number]) => translateLevel(branch.flexibility, locale),
      },
    ],
    [copy, locale],
  );
  const preferenceResult = useMemo(() => {
    const eligible = activeTrip.branches.filter(
      (branch) => selected.includes(branch.id) && (!branch.outcomes?.length || branch.outcomes.includes(activeTrip.decision.status)),
    );
    const eligibleIds = new Set(eligible.map((branch) => branch.id));
    const weights = preferenceWeights[preference];
    const metrics = [
      { key: "cost", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => branch.cost },
      { key: "fatigue", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => branch.fatigue },
      { key: "days", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => branch.days },
      { key: "transit", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => branch.transitHours ?? branch.driveHours },
      { key: "drive", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => branch.driveHours },
      { key: "experience", direction: "higher" as const, value: (branch: TripDocument["branches"][number]) => branch.experienceScore },
      { key: "luggage", direction: "higher" as const, value: (branch: TripDocument["branches"][number]) => levelScore[branch.luggageFlexibility ?? branch.flexibility] },
      { key: "booking", direction: "lower" as const, value: (branch: TripDocument["branches"][number]) => levelScore[branch.bookingComplexity ?? "Medium"] },
      { key: "flexibility", direction: "higher" as const, value: (branch: TripDocument["branches"][number]) => levelScore[branch.flexibility] },
    ];
    const rawScores = new Map<string, number>();
    for (const branch of eligible) {
      let score = 0;
      for (const metric of metrics) {
        const values = eligible.map(metric.value);
        const low = Math.min(...values);
        const high = Math.max(...values);
        const value = metric.value(branch);
        const normalized = high === low
          ? 1
          : metric.direction === "lower"
            ? (high - value) / (high - low)
            : (value - low) / (high - low);
        score += normalized * weights[metric.key];
      }
      rawScores.set(branch.id, score);
    }
    if (preference === "balanced" && eligibleIds.has(recommendation.branchId)) {
      rawScores.forEach((score, id) => rawScores.set(id, id === recommendation.branchId ? 1 : Math.min(score, 0.96)));
    }
    const preferred = eligible.reduce((best, branch) =>
      (rawScores.get(branch.id) ?? 0) > (rawScores.get(best.id) ?? 0) ? branch : best,
    eligible[0] ?? activeTrip.branches[0]);
    const scores = new Map(activeTrip.branches.map((branch) => [
      branch.id,
      eligibleIds.has(branch.id) ? Math.round((rawScores.get(branch.id) ?? 0) * 100) : null,
    ]));
    return { eligibleIds, preferred, scores };
  }, [activeTrip, preference, recommendation.branchId, selected]);
  const selectedPreference = preferenceOptions.find((option) => option.id === preference) ?? preferenceOptions[0];
  const displayRecommendation = useMemo(() => {
    if (preference === "balanced" && preferenceResult.preferred.id === recommendation.branchId) return recommendation;
    const branch = preferenceResult.preferred;
    return {
      branchId: branch.id,
      title: locale === "zh"
        ? `如果你最在意“${selectedPreference.label}”，${branch.name}更合适。`
        : `If “${selectedPreference.label}” matters most, ${branch.name} fits better.`,
      rationale: locale === "zh"
        ? `${branch.summary} 大概花 ${formatMoney(branch.cost, locale)}，路上 ${branch.transitHours ?? branch.driveHours} 小时，行程强度 ${branch.fatigue}/10。`
        : `${branch.summary} It is about ${formatMoney(branch.cost, locale)}, ${branch.transitHours ?? branch.driveHours} hours in transit, and ${branch.fatigue}/10 fatigue.`,
      actions: locale === "zh"
        ? [`核一下“${branch.name}”的完整花销`, "确认已经订好的项目不受影响", "决定前先保留可退款的备选方案"]
        : [`Verify the full cost of “${branch.name}”`, "Confirm fixed bookings still work", "Keep the refundable alternative until you decide"],
    };
  }, [locale, preference, preferenceResult.preferred, recommendation, selectedPreference.label]);
  const activeIsSaved = savedTrips.some((trip) => trip.id === activeTrip.id);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("tripfork_locale") === "zh" ? "zh" : "en";
    const localeTimer = window.setTimeout(() => {
      setLocale(savedLocale);
      if (savedLocale === "zh") {
        setActiveTrip(sampleTripZh);
        setNotice(uiCopy.zh.sampleNotice);
      }
    }, 0);
    const owner = getOwnerId();
    ownerId.current = owner;
    fetch(`/api/trips?owner=${encodeURIComponent(owner)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setSavedTrips(payload.trips ?? []))
      .catch(() => setNotice(uiCopy[savedLocale].savedUnavailable));
    return () => window.clearTimeout(localeTimer);
  }, []);

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    window.localStorage.setItem("tripfork_locale", nextLocale);
    if (activeIsSample) {
      const nextSamples = nextLocale === "zh" ? [sampleTripZh, sampleHawaiiTripZh] : [sampleTrip, sampleHawaiiTrip];
      const nextSample = nextSamples.find((trip) => trip.id === activeTrip.id) ?? nextSamples[0];
      setActiveTrip(nextSample);
      setSelected(nextSample.branches.map((branch) => branch.id));
      setDirty(false);
    }
    setNotice(uiCopy[nextLocale].sampleNotice);
  }

  function updateActive(updater: (trip: TripDocument) => TripDocument) {
    setActiveTrip((current) => updater(current));
    setDirty(true);
  }

  function toggleBranch(id: string) {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.length > 2 ? current.filter((branchId) => branchId !== id) : current;
      }
      return current.length < 3 ? [...current, id] : current;
    });
  }

  function toggleTransport(mode: string) {
    setTripInput((current) => {
      const selected = current.transportModes.includes(mode);
      if (selected && current.transportModes.length === 1) return current;
      return {
        ...current,
        transportModes: selected
          ? current.transportModes.filter((item) => item !== mode)
          : [...current.transportModes, mode],
      };
    });
  }

  function choosePreference(nextPreference: PreferenceId) {
    setPreference(nextPreference);
    setNotice(copy.preferenceUpdated);
  }

  function startNewTrip() {
    setEditingInputs(false);
    setEditingTripId(null);
    setTripInput(createEmptyInput(locale));
    setComposerOpen(true);
  }

  function editInputs() {
    setEditingInputs(true);
    setEditingTripId(activeIsSample ? null : activeTrip.id);
    setTripInput(editableInputFromTrip(activeTrip, locale));
    setComposerOpen(true);
  }

  function setStatus(status: DecisionStatus) {
    updateActive((trip) => ({ ...trip, decision: { ...trip.decision, status } }));
    setNotice(copy.outcomeUpdated);
  }

  async function generateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setNotice("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: tripInput, locale }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not compare this trip.");
      const generatedTrip = payload.trip as TripDocument;
      const trip = editingTripId ? { ...generatedTrip, id: editingTripId } : generatedTrip;
      setActiveTrip(trip);
      setSelected(trip.branches.map((branch) => branch.id));
      setDirty(true);
      setComposerOpen(false);
      setEditingInputs(false);
      setEditingTripId(null);
      setTripInput(createEmptyInput(locale));
      setNotice(
        isEditingInputs
          ? copy.inputsUpdated
          : payload.source === "openai"
          ? locale === "zh" ? "几种方案都整理好了，看看哪一种更适合你。" : "Your full comparison is ready. Review it, then save it."
          : locale === "zh" ? "演示方案已经整理好了。" : "A complete demo comparison is ready. Add OPENAI_API_KEY for live AI planning.",
      );
      window.setTimeout(() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : locale === "zh" ? "刚刚没能整理出方案，再试一次吧。" : "Could not compare this trip.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveCurrentTrip() {
    if (!ownerId.current || activeIsSample) {
      if (activeIsSample) setNotice(locale === "zh" ? "先用自己的行程做一个对比吧，示例本身不会被改动。" : "Create your own trip first; the sample stays unchanged.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: ownerId.current, trip: activeTrip }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save this trip.");
      const saved = payload.trip as TripDocument;
      setActiveTrip(saved);
      setSavedTrips((current) => [saved, ...current.filter((trip) => trip.id !== saved.id)]);
      setDirty(false);
      setNotice(locale === "zh" ? "保存好了。下次可以从“我的方案”里继续看。" : "Saved. You can reopen this trip from My trips on this device.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : locale === "zh" ? "刚刚没保存成功，再试一次吧。" : "Could not save this trip.");
    } finally {
      setSaving(false);
    }
  }

  function openTrip(id: string) {
    const sample = localizedSamples.find((trip) => trip.id === id);
    if (sample) {
      setActiveTrip(sample);
      setSelected(sample.branches.map((branch) => branch.id));
    } else {
      const trip = savedTrips.find((item) => item.id === id);
      if (!trip) return;
      setActiveTrip(trip);
      setSelected(trip.branches.map((branch) => branch.id));
    }
    setDirty(false);
    setNotice(copy.tripLoaded);
  }

  function openExample(id: string) {
    openTrip(id);
    window.setTimeout(() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function deleteCurrentTrip() {
    if (!ownerId.current || activeIsSample) return;
    if (!window.confirm(locale === "zh" ? `删除“${activeTrip.title}”？` : `Delete “${activeTrip.title}”?`)) return;
    const response = await fetch("/api/trips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: ownerId.current, id: activeTrip.id }),
    });
    if (!response.ok) {
      setNotice(locale === "zh" ? "刚刚没删成功，再试一次吧。" : "Could not delete the trip.");
      return;
    }
    setSavedTrips((current) => current.filter((trip) => trip.id !== activeTrip.id));
    openTrip(sampleTrip.id);
    setNotice(locale === "zh" ? "这个方案已经删掉了。" : "Trip deleted.");
  }

  function exportTrip() {
    const blob = new Blob([tripMarkdown(activeTrip, locale, displayRecommendation)], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${activeTrip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tripfork-plan"}.md`;
    link.click();
    URL.revokeObjectURL(href);
    setNotice(copy.exported);
  }

  function commitBranch(branchId: string) {
    updateActive((trip) => ({ ...trip, committedBranchId: branchId }));
    setNotice(copy.planSelected);
  }

  return (
    <main lang={locale === "zh" ? "zh-CN" : "en"}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TripFork home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>TripFork</span>
        </a>
        <nav aria-label={locale === "zh" ? "主导航" : "Main navigation"}><a href="#compare">{copy.navCompare}</a><a href="#actions">{copy.navActions}</a></nav>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={copy.language}>
            {(["zh", "en"] as Locale[]).map((option) => (
              <button key={option} type="button" className={locale === option ? "active" : ""} onClick={() => changeLocale(option)} aria-pressed={locale === option}>{localeNames[option]}</button>
            ))}
          </div>
          <button className="button button-dark" onClick={startNewTrip}>{copy.newTrip} <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> {copy.heroEyebrow}</div>
          <h1>{copy.heroTitleOne}<br />{copy.heroTitleTwo}</h1>
          <p>{copy.heroDescription}</p>
          <button className="button button-dark hero-cta" onClick={startNewTrip}>{copy.buildComparison}</button>
          <div className="hero-examples">
            <span>{copy.tryExample}</span>
            <button type="button" onClick={() => openExample(sampleTrip.id)}>{copy.southwestExample}</button>
            <button type="button" onClick={() => openExample(sampleHawaiiTrip.id)}>{copy.hawaiiExample}</button>
          </div>
        </div>
        <div className="hero-decision">
          <span>{copy.currentFork}</span>
          <strong>{activeTrip.decision.name}</strong>
          <div className="decision-date"><b>{activeTrip.branches.length}</b><span>{copy.completeOptions.split("\n").map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</span></div>
        </div>
      </section>

      <section className="workspace" id="compare">
        <div className="workspace-bar">
          <label>
            <span>{copy.myTrips}</span>
            <select value={activeTrip.id} onChange={(event) => openTrip(event.target.value)}>
              <option value={sampleTrip.id}>{copy.sampleTrip}</option>
              <option value={sampleHawaiiTrip.id}>{copy.sampleHawaii}</option>
              {!activeIsSample && !activeIsSaved && (
                <option value={activeTrip.id}>{activeTrip.title} · {copy.unsaved}</option>
              )}
              {savedTrips.map((trip) => <option value={trip.id} key={trip.id}>{trip.title}</option>)}
            </select>
          </label>
          <div className="workspace-actions">
            {activeIsSaved && <button className="text-button danger" onClick={deleteCurrentTrip}>{copy.delete}</button>}
            <button className="button button-quiet" onClick={editInputs}>{copy.editInputs}</button>
            <button className="button button-quiet" onClick={exportTrip}>{copy.export}</button>
            <button className="button button-dark" onClick={saveCurrentTrip} disabled={isSaving || activeIsSample}>
              {isSaving ? copy.saving : dirty ? copy.saveChanges : copy.saved}
            </button>
          </div>
        </div>

        {notice && <div className="notice" role="status">{notice}</div>}

        <div className="trip-heading">
          <div>
            <div className="breadcrumb">{activeTrip.destination.toUpperCase()} / {activeTrip.dateSummary.toUpperCase()}</div>
            <h2>{activeTrip.title}</h2>
            <p>{activeTrip.destination} · {activeTrip.dateSummary} · {activeTrip.travelers} · {copy.budget} {activeTrip.budget}</p>
          </div>
          <div className="status-block">
            <small>{activeTrip.decision.question}</small>
            <div className="status-control" aria-label={`${activeTrip.decision.name} status`}>
              {(["pending", "positive", "negative"] as DecisionStatus[]).map((status) => (
                <button key={status} className={activeTrip.decision.status === status ? "active" : ""} onClick={() => setStatus(status)}>
                  {status === "pending" ? copy.pending : status === "positive" ? activeTrip.decision.positiveLabel : activeTrip.decision.negativeLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTrip.inputSummary && (
          <details className="input-receipt">
            <summary>
              <span>{copy.inputs}</span>
              <b>{activeTrip.inputSummary.transportModes.join(locale === "zh" ? " / " : " vs ")}</b>
            </summary>
            <div className="input-receipt-grid">
              <div><span>{copy.startingFrom}</span><p>{activeTrip.inputSummary.origin || copy.notSpecified}</p></div>
              <div><span>{copy.placesStops}</span><p>{activeTrip.inputSummary.places || copy.notSpecified}</p></div>
              <div><span>{copy.mustKeep}</span><p>{activeTrip.inputSummary.lockedItems || copy.notSpecified}</p></div>
              <div><span>{copy.canMove}</span><p>{activeTrip.inputSummary.movableItems || copy.notSpecified}</p></div>
              <div><span>{copy.canSkip}</span><p>{activeTrip.inputSummary.optionalItems || copy.notSpecified}</p></div>
              <div className="baseline-plan"><span>{copy.existingPlan}</span><p>{activeTrip.inputSummary.existingPlan}</p></div>
            </div>
          </details>
        )}

        <div className="decision-banner">
          <div className="decision-icon" aria-hidden="true">↳</div>
          <div>
            <span>{copy.recommendation} · {activeTrip.decision.status === "pending" ? copy.pending : activeTrip.decision.status === "positive" ? activeTrip.decision.positiveLabel : activeTrip.decision.negativeLabel}</span>
            <h3>{displayRecommendation.title}</h3>
            <p>{displayRecommendation.rationale}</p>
          </div>
          <button className="button button-light" onClick={() => document.getElementById(`branch-${displayRecommendation.branchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{copy.viewRecommendation}</button>
        </div>

        <section className="priority-panel" aria-labelledby="priority-title">
          <div className="priority-heading">
            <span>{copy.priorityEyebrow}</span>
            <h3 id="priority-title">{copy.priorityTitle}</h3>
            <p>{copy.priorityHelp}</p>
          </div>
          <div className="priority-options" role="radiogroup" aria-label={copy.priorityTitle}>
            {preferenceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={preference === option.id}
                className={preference === option.id ? "active" : ""}
                onClick={() => choosePreference(option.id)}
              >
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
          <div className="priority-result" aria-live="polite">
            <span>{copy.bestFitNow}</span>
            <strong>{preferenceResult.preferred.name}</strong>
            <b>{preferenceResult.scores.get(preferenceResult.preferred.id) ?? 0}/100</b>
          </div>
        </section>

        <div className="comparison-toolbar matrix-toolbar">
          <div className="branch-select">
            <span>{copy.navCompare}</span>
            {activeTrip.branches.map((branch, index) => (
              <button key={branch.id} onClick={() => toggleBranch(branch.id)} className={selected.includes(branch.id) ? "selected" : ""} aria-pressed={selected.includes(branch.id)}>
                <i style={{ background: branchAccents[index] }} />{String.fromCharCode(65 + index)}
              </button>
            ))}
          </div>
          <label className="switch"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} /><span />{copy.differencesOnly}</label>
        </div>

        <section className="comparison-matrix" aria-labelledby="comparison-matrix-title">
          <div className="matrix-heading">
            <div>
              <span>{copy.matrixEyebrow}</span>
              <h3 id="comparison-matrix-title">{copy.matrixTitle}</h3>
            </div>
            <p><b>✓</b> {copy.matrixHelp}</p>
          </div>
          <div className="matrix-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{copy.category}</th>
                  {comparedBranches.map((branch) => (
                    <th scope="col" key={branch.id} style={{ "--accent": branchAccents[activeTrip.branches.findIndex((item) => item.id === branch.id)] } as React.CSSProperties}>
                      <span>{copy.plan} {String.fromCharCode(65 + activeTrip.branches.findIndex((item) => item.id === branch.id))}</span>
                      <strong>{branch.name}</strong>
                      <small>{branch.transportMode || copy.mixedTransport}</small>
                      {branch.id === displayRecommendation.branchId && <b>{copy.recommended}</b>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="overall-fit-row">
                  <th scope="row"><strong>{copy.overallFit}</strong><small>{selectedPreference.label}</small></th>
                  {comparedBranches.map((branch) => {
                    const score = preferenceResult.scores.get(branch.id);
                    const isBest = branch.id === preferenceResult.preferred.id;
                    return (
                      <td className={isBest ? "matrix-best" : ""} key={branch.id}>
                        <span>{score === null || score === undefined ? "—" : `${score}/100`}</span>
                        {score === null && <small>{copy.unavailableForOutcome}</small>}
                        {isBest && <b className="winner-check" aria-label={copy.bestFitNow}>✓</b>}
                      </td>
                    );
                  })}
                </tr>
                {comparisonRows.map((row) => {
                  const scores = comparedBranches.map(row.score);
                  const best = row.direction === "lower" ? Math.min(...scores) : Math.max(...scores);
                  return (
                    <tr key={row.label}>
                      <th scope="row"><strong>{row.label}</strong><small>{row.hint}</small></th>
                      {comparedBranches.map((branch) => {
                        const isBest = row.score(branch) === best;
                        return <td className={isBest ? "matrix-best" : ""} key={branch.id}><span>{row.display(branch)}</span>{isBest && <b className="winner-check" aria-label={copy.bestCategory}>✓</b>}</td>;
                      })}
                    </tr>
                  );
                })}
                <tr className="matrix-text-row">
                  <th scope="row"><strong>{copy.mainTradeoff}</strong><small>{copy.whatGiveUp}</small></th>
                  {comparedBranches.map((branch) => <td key={branch.id}>{branch.tradeoffs.slice(0, 2).join(" · ")}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="planning-grid">
          <div className="comparison-area">
            <div className="branch-grid" style={{ "--branch-count": comparedBranches.length } as React.CSSProperties}>
              {comparedBranches.map((branch) => {
                const index = activeTrip.branches.findIndex((item) => item.id === branch.id);
                const isRecommended = branch.id === displayRecommendation.branchId;
                const isCommitted = branch.id === activeTrip.committedBranchId;
                return (
                  <article className={`branch-card ${isRecommended ? "recommended" : ""}`} id={`branch-${branch.id}`} key={branch.id} style={{ "--accent": branchAccents[index] } as React.CSSProperties}>
                    <div className="branch-topline"><span>{copy.plan.toUpperCase()} {String.fromCharCode(65 + index)}</span><div>{isRecommended && <b>{copy.recommended}</b>}{isCommitted && <b className="chosen-badge">{copy.chosen}</b>}</div></div>
                    <h3>{branch.name}</h3>
                    <p className="branch-subtitle">{branch.subtitle}</p>
                    <div className="transport-label">{branch.transportMode || copy.mixedTransport}</div>
                    <p className="branch-summary">{branch.summary}</p>
                    <div className="metrics">
                      <div><strong>{branch.days}</strong><span>{copy.days}</span></div>
                      <div><strong>{formatMoney(branch.cost, locale)}</strong><span>{copy.estCost}</span></div>
                      <div><strong>{branch.transitHours ?? branch.driveHours}h</strong><span>{copy.totalTransit}</span></div>
                      <div><strong>{branch.driveHours}h</strong><span>{copy.driving}</span></div>
                      <div><strong>{branch.fatigue}/10</strong><span>{copy.fatigue}</span><i className="meter"><i style={{ width: `${branch.fatigue * 10}%` }} /></i></div>
                      <div><strong>{translateLevel(branch.luggageFlexibility || branch.flexibility, locale)}</strong><span>{copy.luggageFreedom}</span></div>
                    </div>
                    <div className="transport-tradeoffs">
                      <span>{copy.bookingComplexity}: <b>{translateLevel(branch.bookingComplexity || "Medium", locale)}</b></span>
                      <span>{copy.routeFlexibility}: <b>{translateLevel(branch.flexibility, locale)}</b></span>
                    </div>
                    <div className="score-row"><span>{copy.experienceScore}</span><strong>{branch.experienceScore}/10</strong><div className="score-dots">{Array.from({ length: 10 }, (_, dot) => <i className={dot < branch.experienceScore ? "filled" : ""} key={dot} />)}</div></div>
                    <div className="change-block"><span>{copy.whatChanges}</span><ul>{branch.changes.map((change) => <li key={change}>{change}</li>)}</ul></div>
                    {!differencesOnly && <div className="timeline">{branch.timeline.map((item) => <div className="timeline-day" key={`${branch.id}-${item.day}`}><span>{item.day}</span><i /><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}</div>}
                    <div className="tradeoff-block"><span>{copy.tradeAway}</span><div>{branch.tradeoffs.map((item) => <b key={item}>{item}</b>)}</div></div>
                    <button className={`choose-button ${isCommitted ? "active" : ""}`} onClick={() => commitBranch(branch.id)}>{isCommitted ? copy.selectedPlan : copy.choosePlan}</button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="action-panel" id="actions">
            <div className="action-heading"><span>{copy.decisionDesk}</span><b>{activeTrip.checklist.filter((item) => item.done).length}/{activeTrip.checklist.length}</b></div>
            <h3>{copy.whatNext}</h3>
            <p>{copy.reminderDisclaimer}</p>
            <div className="recommended-actions">{displayRecommendation.actions.map((action) => <div key={action}><span>→</span>{action}</div>)}</div>
            <div className="checklist">
              {activeTrip.checklist.map((item) => (
                <label className={item.done ? "done" : ""} key={item.id}>
                  <input type="checkbox" checked={item.done} onChange={() => updateActive((trip) => ({ ...trip, checklist: trip.checklist.map((check) => check.id === item.id ? { ...check, done: !check.done } : check) }))} />
                  <span><b>{item.label}</b><small>{item.dueDate} · {translateKind(item.kind, locale)}</small></span>
                </label>
              ))}
            </div>
            <button className="button button-dark panel-save" onClick={saveCurrentTrip} disabled={activeIsSample || isSaving}>{copy.saveDecision}</button>
          </aside>
        </div>
      </section>

      <section className="how" id="how">
        <div><span className="section-number">01</span><h3>{copy.howOneTitle}</h3><p>{copy.howOneBody}</p></div>
        <div><span className="section-number">02</span><h3>{copy.howTwoTitle}</h3><p>{copy.howTwoBody}</p></div>
        <div><span className="section-number">03</span><h3>{copy.howThreeTitle}</h3><p>{copy.howThreeBody}</p></div>
      </section>

      <footer><div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>TripFork</span></div><p>{copy.footerTagline}</p><span>{copy.builtFor}</span></footer>

      {isComposerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isGenerating && setComposerOpen(false)}>
          <section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setComposerOpen(false)} aria-label={copy.close}>×</button>
            <span className="eyebrow">{isEditingInputs ? copy.editComposerEyebrow : copy.composerEyebrow}</span>
            <h2 id="composer-title">{isEditingInputs ? copy.editComposerTitle : copy.composerTitle}</h2>
            <p>{isEditingInputs ? copy.editComposerBody : copy.composerBody}</p>
            <form onSubmit={generateTrip} className="trip-form">
              <div className="form-grid">
                <label><span>{copy.tripName}</span><input value={tripInput.title} onChange={(e) => setTripInput({ ...tripInput, title: e.target.value })} placeholder={locale === "zh" ? "夏威夷大岛 7 日" : "Big Island in 7 days"} /></label>
                <label><span>{copy.destination}</span><input required value={tripInput.destination} onChange={(e) => setTripInput({ ...tripInput, destination: e.target.value })} placeholder={locale === "zh" ? "夏威夷大岛" : "Hawaii Big Island"} /></label>
                <label><span>{copy.datesLength}</span><input value={tripInput.dates} onChange={(e) => setTripInput({ ...tripInput, dates: e.target.value })} placeholder={locale === "zh" ? "2 月 16–23 日 · 7 天" : "Feb 16–23 · 7 days"} /></label>
                <label><span>{copy.travelers}</span><input value={tripInput.travelers} onChange={(e) => setTripInput({ ...tripInput, travelers: e.target.value })} /></label>
                <label><span>{copy.budget}</span><input value={tripInput.budget} onChange={(e) => setTripInput({ ...tripInput, budget: e.target.value })} placeholder={locale === "zh" ? "总预算 $4,000" : "$4,000 total"} /></label>
                <label><span>{copy.startingFrom}</span><input value={tripInput.origin} onChange={(e) => setTripInput({ ...tripInput, origin: e.target.value })} placeholder={locale === "zh" ? "旧金山湾区" : "San Francisco Bay Area"} /></label>
                <label><span>{copy.decisionDate}</span><input value={tripInput.decisionDate} onChange={(e) => setTripInput({ ...tripInput, decisionDate: e.target.value })} placeholder={locale === "zh" ? "7 月 18 日公布抽签结果" : "Lottery result Jul 18"} /></label>
              </div>
              <label><span>{copy.baseline}</span><textarea required minLength={20} rows={5} value={tripInput.notes} onChange={(e) => setTripInput({ ...tripInput, notes: e.target.value })} placeholder={locale === "zh" ? "比如：第 1 天旧金山 → 拉斯维加斯；第 2 天锡安 → 布莱斯……不用重新整理，直接把已有行程贴过来。" : "Paste the itinerary you already have: Day 1 SF → Vegas; Day 2 Zion → Bryce… TripFork will preserve it as the baseline."} /></label>
              <label><span>{copy.inputPoints}</span><textarea rows={3} value={tripInput.places} onChange={(e) => setTripInput({ ...tripInput, places: e.target.value })} placeholder={locale === "zh" ? "锡安、布莱斯、佩吉、The Wave 抽签、下午 1:15 的羚羊谷、纪念碑谷……" : "Zion, Bryce, Page, The Wave lottery, Antelope Canyon at 1:15 PM, Monument Valley…"} /></label>
              <fieldset className="transport-picker">
                <legend>{copy.transportQuestion}</legend>
                <p>{copy.transportHelp}</p>
                <div>
                  {transportChoices.map((mode) => (
                    <label className={tripInput.transportModes.includes(mode) ? "selected" : ""} key={mode}>
                      <input type="checkbox" checked={tripInput.transportModes.includes(mode)} onChange={() => toggleTransport(mode)} />
                      <span>{transportCopy[locale][mode]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="form-grid">
                <label><span>{copy.mustHaves}</span><textarea rows={3} value={tripInput.mustHaves} onChange={(e) => setTripInput({ ...tripInput, mustHaves: e.target.value })} placeholder={locale === "zh" ? "夜潜看魔鬼鱼、火山、不安排高难度游泳" : "Manta ray night dive, volcano, no difficult swimming"} /></label>
                <label><span>{copy.fixedBookings}</span><textarea rows={3} value={tripInput.fixedBookings} onChange={(e) => setTripInput({ ...tripInput, fixedBookings: e.target.value })} placeholder={locale === "zh" ? "机票、不可退款酒店、旅行团时间" : "Flights, nonrefundable hotels, tour times"} /></label>
                <label><span>{copy.mustKeepExactly}</span><textarea rows={3} value={tripInput.lockedItems} onChange={(e) => setTripInput({ ...tripInput, lockedItems: e.target.value })} placeholder={locale === "zh" ? "周日返程航班；周五下午 1:15 羚羊谷" : "Flight home Sunday; Antelope tour Friday 1:15 PM"} /></label>
                <label><span>{copy.moveAnotherDay}</span><textarea rows={3} value={tripInput.movableItems} onChange={(e) => setTripInput({ ...tripInput, movableItems: e.target.value })} placeholder={locale === "zh" ? "冒纳凯阿、大峡谷日出、佩吉酒店" : "Mauna Kea, Grand Canyon sunrise, Page hotel"} /></label>
                <label><span>{copy.niceToHave}</span><textarea rows={3} value={tripInput.optionalItems} onChange={(e) => setTripInput({ ...tripInput, optionalItems: e.target.value })} placeholder={locale === "zh" ? "鲍威尔湖、集市、景观绕行" : "Lake Powell, market, scenic detour"} /></label>
                <label><span>{copy.otherUncertain}</span><textarea rows={3} value={tripInput.uncertainty} onChange={(e) => setTripInput({ ...tripInput, uncertainty: e.target.value })} placeholder={locale === "zh" ? "例如：The Wave 抽签、火山活动、山顶天气" : "Optional: The Wave lottery; volcano activity; summit weather"} /></label>
                <label><span>{copy.constraints}</span><textarea rows={3} value={tripInput.constraints} onChange={(e) => setTripInput({ ...tripInput, constraints: e.target.value })} placeholder={locale === "zh" ? "最长驾驶时间、行动能力、预算、需要请假的工作日" : "Max driving, mobility, budget, workdays"} /></label>
              </div>
              <div className="composer-footer"><small>{copy.liveDataDisclaimer}</small><button className="button button-dark" disabled={isGenerating}>{isGenerating ? (isEditingInputs ? copy.rebuilding : copy.generating) : (isEditingInputs ? copy.rebuildComparison : copy.buildComparison)}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
