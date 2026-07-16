"use client";

import { FormEvent, useMemo, useState } from "react";

type LotteryStatus = "pending" | "won" | "lost";

type TimelineDay = {
  day: string;
  route: string;
  detail: string;
};

type Branch = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  accent: string;
  days: number;
  cost: number;
  driving: number;
  fatigue: number;
  experiences: number;
  flexibility: "Low" | "Medium" | "High";
  changes: string[];
  givesUp: string[];
  timeline: TimelineDay[];
};

type GeneratedComparison = {
  title: string;
  decision: string;
  recommendation: string;
  branches: Array<{
    id: string;
    name: string;
    subtitle: string;
    days: number;
    cost: number;
    driveHours: number;
    fatigue: number;
    experienceScore: number;
    flexibility: "Low" | "Medium" | "High";
    summary: string;
    changes: string[];
    tradeoffs: string[];
    timeline: Array<{ day: string; title: string; detail: string }>;
  }>;
};

const branches: Branch[] = [
  {
    id: "loop",
    label: "PLAN A",
    title: "Keep the 6-day loop",
    subtitle: "Best if the permit doesn’t happen",
    accent: "#ff7a51",
    days: 6,
    cost: 1780,
    driving: 39,
    fatigue: 9,
    experiences: 5,
    flexibility: "Low",
    changes: [
      "Keep every existing hotel",
      "Use Page day for Antelope Canyon",
      "No reservation changes",
    ],
    givesUp: ["The Wave", "Recovery time", "Daylight buffer"],
    timeline: [
      { day: "01", route: "Bay Area → Las Vegas", detail: "Transit day · 9h" },
      { day: "02", route: "Zion → Bryce", detail: "Two parks · arrive after dark" },
      { day: "03", route: "Bryce → Page", detail: "Sunrise + Lake Powell" },
      { day: "04", route: "Page → Monument Valley", detail: "Antelope slot · 1:15 PM" },
      { day: "05", route: "Grand Canyon → Las Vegas", detail: "Sunrise + 7h driving" },
      { day: "06", route: "Las Vegas → Bay Area", detail: "Transit day · 9h" },
    ],
  },
  {
    id: "extra-day",
    label: "PLAN B",
    title: "Win + add one day",
    subtitle: "The fullest experience, with room to breathe",
    accent: "#254e3d",
    days: 7,
    cost: 2260,
    driving: 41,
    fatigue: 7,
    experiences: 6,
    flexibility: "High",
    changes: [
      "Add one Page-area night",
      "Protect a full day for The Wave",
      "Move Antelope Canyon to Day 5",
    ],
    givesUp: ["One workday", "$480 more", "Original hotel sequence"],
    timeline: [
      { day: "01", route: "Bay Area → Las Vegas", detail: "Transit day · 9h" },
      { day: "02", route: "Zion → Bryce", detail: "Two parks · arrive after dark" },
      { day: "03", route: "Bryce → Page", detail: "Sunrise + early finish" },
      { day: "04", route: "The Wave", detail: "Full hiking day · permit required" },
      { day: "05", route: "Page → Monument Valley", detail: "Antelope + sunset" },
      { day: "06", route: "Grand Canyon → Las Vegas", detail: "More daylight buffer" },
      { day: "07", route: "Las Vegas → Bay Area", detail: "Transit day · 9h" },
    ],
  },
  {
    id: "fly",
    label: "PLAN C",
    title: "Win + fly to Vegas",
    subtitle: "Fit The Wave into six days without the road grind",
    accent: "#4e68d8",
    days: 6,
    cost: 2480,
    driving: 24,
    fatigue: 6,
    experiences: 6,
    flexibility: "Medium",
    changes: [
      "Replace two transit days with flights",
      "Pick up the car in Las Vegas",
      "Use recovered time for The Wave",
    ],
    givesUp: ["$700 more", "Your own car", "Flexible luggage"],
    timeline: [
      { day: "01", route: "Fly to Vegas → Zion", detail: "Land by 9 AM" },
      { day: "02", route: "Bryce → Page", detail: "Sunrise + relaxed afternoon" },
      { day: "03", route: "The Wave", detail: "Full hiking day · permit required" },
      { day: "04", route: "Page → Monument Valley", detail: "Antelope + sunset" },
      { day: "05", route: "Grand Canyon → Las Vegas", detail: "South Rim · 4h" },
      { day: "06", route: "Fly to Bay Area", detail: "Home by afternoon" },
    ],
  },
];

const statusCopy: Record<
  LotteryStatus,
  { eyebrow: string; title: string; body: string; recommended: string }
> = {
  pending: {
    eyebrow: "Decision pending",
    title: "Keep Plan A bookable. Hold Plan C lightly.",
    body: "The lottery result arrives before the free-cancellation window. Paying $86 for refundable lodging preserves both outcomes.",
    recommended: "extra-day",
  },
  won: {
    eyebrow: "Permit won",
    title: "Plan C is the strongest six-day trip.",
    body: "Flying removes 15 hours of driving and creates a full hiking day without dropping Antelope Canyon or Monument Valley.",
    recommended: "fly",
  },
  lost: {
    eyebrow: "Permit not won",
    title: "Plan A is ready—no replanning required.",
    body: "Your original loop keeps all five parks and every current booking. Release the flexible Page hold before July 19.",
    recommended: "loop",
  },
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function TripForkApp() {
  const [status, setStatus] = useState<LotteryStatus>("pending");
  const [selected, setSelected] = useState<string[]>(["loop", "fly"]);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [tripPrompt, setTripPrompt] = useState(
    "I have 7 days for Hawaii Big Island. Volcano activity and Mauna Kea weather are uncertain. Manta ray night dive is fixed. We are not strong swimmers and want to keep the trip under $4,000 for two people.",
  );
  const [isGenerating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedComparison | null>(null);
  const [generationNote, setGenerationNote] = useState("");

  const recommendation = statusCopy[status];
  const comparedBranches = useMemo(
    () => branches.filter((branch) => selected.includes(branch.id)),
    [selected],
  );

  function toggleBranch(id: string) {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.length > 2
          ? current.filter((branchId) => branchId !== id)
          : current;
      }
      return current.length < 3 ? [...current, id] : current;
    });
  }

  async function generateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tripPrompt.trim().length < 30) return;
    setGenerating(true);
    setGenerationNote("");

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: tripPrompt }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not compare this trip.");
      setGenerated(payload.comparison);
      setGenerationNote(
        payload.source === "openai"
          ? "Compared with GPT-5.6"
          : "Demo mode · add OPENAI_API_KEY for live GPT-5.6 comparisons",
      );
    } catch (error) {
      setGenerationNote(
        error instanceof Error ? error.message : "Could not compare this trip.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TripFork home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>TripFork</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#compare">Compare</a>
          <a href="#how">How it works</a>
        </nav>
        <button className="button button-dark" onClick={() => setComposerOpen(true)}>
          Fork a new trip <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> Your trip has more than one future
          </div>
          <h1>
            Compare every way
            <br />
            your trip could go.
          </h1>
          <p>
            TripFork turns permits, weather, and changing plans into complete
            itineraries you can compare—before you commit.
          </p>
        </div>
        <div className="hero-decision">
          <span>Today’s decision</span>
          <strong>The Wave lottery</strong>
          <div className="decision-date">
            <b>18</b>
            <span>JUL<br />RESULT</span>
          </div>
        </div>
      </section>

      <section className="workspace" id="compare">
        <div className="trip-heading">
          <div>
            <div className="breadcrumb">MY TRIPS / SOUTHWEST LOOP</div>
            <h2>What if we win The Wave?</h2>
            <p>Bay Area · 6 days · 2 travelers · Apr 30–May 5</p>
          </div>
          <div className="status-control" aria-label="The Wave lottery status">
            {(["pending", "won", "lost"] as LotteryStatus[]).map((item) => (
              <button
                key={item}
                className={status === item ? "active" : ""}
                onClick={() => setStatus(item)}
              >
                {item === "pending" ? "Pending" : item === "won" ? "Won" : "Not won"}
              </button>
            ))}
          </div>
        </div>

        <div className="decision-banner">
          <div className="decision-icon" aria-hidden="true">↳</div>
          <div>
            <span>{recommendation.eyebrow}</span>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.body}</p>
          </div>
          <button
            className="button button-light"
            onClick={() =>
              document
                .getElementById(`branch-${recommendation.recommended}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            View recommendation
          </button>
        </div>

        <div className="comparison-toolbar">
          <div className="branch-select">
            <span>Compare</span>
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => toggleBranch(branch.id)}
                className={selected.includes(branch.id) ? "selected" : ""}
                aria-pressed={selected.includes(branch.id)}
              >
                <i style={{ background: branch.accent }} />
                {branch.label.replace("PLAN ", "")}
              </button>
            ))}
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(event) => setDifferencesOnly(event.target.checked)}
            />
            <span />
            Differences only
          </label>
        </div>

        <div
          className="branch-grid"
          style={{ "--branch-count": comparedBranches.length } as React.CSSProperties}
        >
          {comparedBranches.map((branch) => {
            const isRecommended = branch.id === recommendation.recommended;
            return (
              <article
                className={`branch-card ${isRecommended ? "recommended" : ""}`}
                id={`branch-${branch.id}`}
                key={branch.id}
                style={{ "--accent": branch.accent } as React.CSSProperties}
              >
                <div className="branch-topline">
                  <span>{branch.label}</span>
                  {isRecommended && <b>Recommended</b>}
                </div>
                <h3>{branch.title}</h3>
                <p className="branch-subtitle">{branch.subtitle}</p>

                <div className="metrics">
                  <div><strong>{branch.days}</strong><span>days</span></div>
                  <div><strong>{money.format(branch.cost)}</strong><span>est. cost</span></div>
                  <div><strong>{branch.driving}h</strong><span>driving</span></div>
                  <div>
                    <strong>{branch.fatigue}/10</strong>
                    <span>fatigue</span>
                    <i className="meter"><i style={{ width: `${branch.fatigue * 10}%` }} /></i>
                  </div>
                </div>

                <div className="score-row">
                  <span>Experience coverage</span>
                  <strong>{branch.experiences}/6</strong>
                  <div className="score-dots">
                    {Array.from({ length: 6 }, (_, index) => (
                      <i className={index < branch.experiences ? "filled" : ""} key={index} />
                    ))}
                  </div>
                </div>

                <div className="change-block">
                  <span>{differencesOnly ? "What changes" : "Why this branch works"}</span>
                  <ul>
                    {branch.changes.map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </div>

                {!differencesOnly && (
                  <div className="timeline">
                    {branch.timeline.map((item) => (
                      <div className="timeline-day" key={`${branch.id}-${item.day}`}>
                        <span>{item.day}</span>
                        <i />
                        <div><strong>{item.route}</strong><small>{item.detail}</small></div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="tradeoff-block">
                  <span>You trade away</span>
                  <div>{branch.givesUp.map((item) => <b key={item}>{item}</b>)}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="how" id="how">
        <div>
          <span className="section-number">01</span>
          <h3>Describe the trip once.</h3>
          <p>Dates, must-haves, reservations, budget, energy, and the things that might change.</p>
        </div>
        <div>
          <span className="section-number">02</span>
          <h3>See complete alternatives.</h3>
          <p>Not a list of ideas—full itineraries with comparable costs and consequences.</p>
        </div>
        <div>
          <span className="section-number">03</span>
          <h3>Let reality choose the branch.</h3>
          <p>When the permit, weather, or live event changes, activate the plan already waiting.</p>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>TripFork</span></div>
        <p>Plan the trip—and everything that might change it.</p>
        <span>Built for OpenAI Build Week 2026</span>
      </footer>

      {isComposerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setComposerOpen(false)}>
          <section
            className="composer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setComposerOpen(false)} aria-label="Close">×</button>
            <span className="eyebrow">Create a decision-ready trip</span>
            <h2 id="composer-title">What could change your plan?</h2>
            <p>
              Paste the messy version. Include fixed bookings, must-haves,
              uncertainties, constraints, and anything you keep debating.
            </p>
            <form onSubmit={generateTrip}>
              <textarea
                value={tripPrompt}
                onChange={(event) => setTripPrompt(event.target.value)}
                minLength={30}
                rows={8}
              />
              <div className="composer-footer">
                <small>Your travel data is sent only when you generate a comparison.</small>
                <button className="button button-dark" disabled={isGenerating}>
                  {isGenerating ? "Building branches…" : "Compare my options →"}
                </button>
              </div>
            </form>

            {generationNote && <div className="generation-note">{generationNote}</div>}

            {generated && (
              <div className="generated-result">
                <span>New comparison</span>
                <h3>{generated.title}</h3>
                <p>{generated.recommendation}</p>
                <div className="generated-branches">
                  {generated.branches.map((branch) => (
                    <div key={branch.id}>
                      <b>{branch.name}</b>
                      <small>{branch.days} days · {money.format(branch.cost)} · fatigue {branch.fatigue}/10</small>
                      <p>{branch.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
