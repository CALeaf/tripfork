"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { branchAccents, type DecisionStatus, type TripDocument, type TripInput } from "@/lib/trip-types";
import { sampleTrip } from "@/lib/sample-trip";

const emptyInput: TripInput = {
  title: "",
  destination: "",
  dates: "",
  travelers: "2 travelers",
  budget: "",
  notes: "",
  mustHaves: "",
  fixedBookings: "",
  uncertainty: "",
  decisionDate: "",
  constraints: "",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function getOwnerId() {
  const key = "tripfork_owner_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function tripMarkdown(trip: TripDocument) {
  const recommendation = trip.recommendations[trip.decision.status];
  const lines = [
    `# ${trip.title}`,
    "",
    `${trip.destination} · ${trip.dateSummary} · ${trip.travelers} · Budget ${trip.budget}`,
    "",
    `## Current recommendation: ${recommendation.title}`,
    "",
    recommendation.rationale,
    "",
    ...recommendation.actions.map((action) => `- [ ] ${action}`),
    "",
    "## Compared plans",
    "",
  ];
  for (const branch of trip.branches) {
    lines.push(
      `### ${branch.name}${recommendation.branchId === branch.id ? " — recommended" : ""}`,
      "",
      `${branch.days} days · ${money.format(branch.cost)} estimated · ${branch.driveHours}h driving · fatigue ${branch.fatigue}/10`,
      "",
      branch.summary,
      "",
      ...branch.timeline.map((day) => `- **${day.day}: ${day.title}** — ${day.detail}`),
      "",
      `Tradeoffs: ${branch.tradeoffs.join(", ")}`,
      "",
    );
  }
  lines.push("## Action list", "", ...trip.checklist.map((item) => `- [${item.done ? "x" : " "}] ${item.label} — ${item.dueDate}`));
  return lines.join("\n");
}

export function TripForkApp() {
  const [activeTrip, setActiveTrip] = useState<TripDocument>(sampleTrip);
  const [savedTrips, setSavedTrips] = useState<TripDocument[]>([]);
  const [selected, setSelected] = useState<string[]>(sampleTrip.branches.map((branch) => branch.id));
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [tripInput, setTripInput] = useState<TripInput>(emptyInput);
  const [isGenerating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("Showing the sample trip. Create yours when you’re ready.");
  const [isSaving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ownerId = useRef("");

  const recommendation = activeTrip.recommendations[activeTrip.decision.status];
  const comparedBranches = useMemo(
    () => activeTrip.branches.filter((branch) => selected.includes(branch.id)),
    [activeTrip, selected],
  );
  const activeIsSaved = savedTrips.some((trip) => trip.id === activeTrip.id);

  useEffect(() => {
    const owner = getOwnerId();
    ownerId.current = owner;
    fetch(`/api/trips?owner=${encodeURIComponent(owner)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setSavedTrips(payload.trips ?? []))
      .catch(() => setNotice("Saved trips are unavailable in this preview, but comparison still works."));
  }, []);

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

  function setStatus(status: DecisionStatus) {
    updateActive((trip) => ({ ...trip, decision: { ...trip.decision, status } }));
    setNotice("The recommendation and next actions now reflect the new outcome.");
  }

  async function generateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setNotice("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: tripInput }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not compare this trip.");
      const trip = payload.trip as TripDocument;
      setActiveTrip(trip);
      setSelected(trip.branches.map((branch) => branch.id));
      setDirty(true);
      setComposerOpen(false);
      setTripInput(emptyInput);
      setNotice(
        payload.source === "openai"
          ? "Your full comparison is ready. Review it, then save it."
          : "A complete demo comparison is ready. Add OPENAI_API_KEY for live AI planning.",
      );
      window.setTimeout(() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not compare this trip.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveCurrentTrip() {
    if (!ownerId.current || activeTrip.id === sampleTrip.id) {
      if (activeTrip.id === sampleTrip.id) setNotice("Create your own trip first; the sample stays unchanged.");
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
      setNotice("Saved. You can reopen this trip from My trips on this device.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this trip.");
    } finally {
      setSaving(false);
    }
  }

  function openTrip(id: string) {
    if (id === sampleTrip.id) {
      setActiveTrip(sampleTrip);
      setSelected(sampleTrip.branches.map((branch) => branch.id));
    } else {
      const trip = savedTrips.find((item) => item.id === id);
      if (!trip) return;
      setActiveTrip(trip);
      setSelected(trip.branches.map((branch) => branch.id));
    }
    setDirty(false);
    setNotice("Trip loaded.");
  }

  async function deleteCurrentTrip() {
    if (!ownerId.current || activeTrip.id === sampleTrip.id) return;
    if (!window.confirm(`Delete “${activeTrip.title}”?`)) return;
    const response = await fetch("/api/trips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: ownerId.current, id: activeTrip.id }),
    });
    if (!response.ok) {
      setNotice("Could not delete the trip.");
      return;
    }
    setSavedTrips((current) => current.filter((trip) => trip.id !== activeTrip.id));
    openTrip(sampleTrip.id);
    setNotice("Trip deleted.");
  }

  function exportTrip() {
    const blob = new Blob([tripMarkdown(activeTrip)], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${activeTrip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tripfork-plan"}.md`;
    link.click();
    URL.revokeObjectURL(href);
    setNotice("Exported a Markdown plan you can edit, share, or paste into Notes.");
  }

  function commitBranch(branchId: string) {
    updateActive((trip) => ({ ...trip, committedBranchId: branchId }));
    setNotice("Plan selected. Save the trip to keep this decision.");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TripFork home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>TripFork</span>
        </a>
        <nav aria-label="Main navigation"><a href="#compare">Compare</a><a href="#actions">Actions</a></nav>
        <button className="button button-dark" onClick={() => setComposerOpen(true)}>Fork a new trip <span aria-hidden="true">↗</span></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> Your trip has more than one future</div>
          <h1>Compare every way<br />your trip could go.</h1>
          <p>Turn permits, weather, changing prices, and “what ifs” into complete itineraries—with a decision and action plan attached.</p>
          <button className="button button-dark hero-cta" onClick={() => setComposerOpen(true)}>Build my comparison →</button>
        </div>
        <div className="hero-decision">
          <span>Current fork</span>
          <strong>{activeTrip.decision.name}</strong>
          <div className="decision-date"><b>{activeTrip.branches.length}</b><span>COMPLETE<br />OPTIONS</span></div>
        </div>
      </section>

      <section className="workspace" id="compare">
        <div className="workspace-bar">
          <label>
            <span>My trips</span>
            <select value={activeTrip.id} onChange={(event) => openTrip(event.target.value)}>
              <option value={sampleTrip.id}>Sample · Southwest loop</option>
              {activeTrip.id !== sampleTrip.id && !activeIsSaved && (
                <option value={activeTrip.id}>{activeTrip.title} · unsaved</option>
              )}
              {savedTrips.map((trip) => <option value={trip.id} key={trip.id}>{trip.title}</option>)}
            </select>
          </label>
          <div className="workspace-actions">
            {activeIsSaved && <button className="text-button danger" onClick={deleteCurrentTrip}>Delete</button>}
            <button className="button button-quiet" onClick={exportTrip}>Export .md</button>
            <button className="button button-dark" onClick={saveCurrentTrip} disabled={isSaving || activeTrip.id === sampleTrip.id}>
              {isSaving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        {notice && <div className="notice" role="status">{notice}</div>}

        <div className="trip-heading">
          <div>
            <div className="breadcrumb">{activeTrip.destination.toUpperCase()} / {activeTrip.dateSummary.toUpperCase()}</div>
            <h2>{activeTrip.title}</h2>
            <p>{activeTrip.destination} · {activeTrip.dateSummary} · {activeTrip.travelers} · Budget {activeTrip.budget}</p>
          </div>
          <div className="status-block">
            <small>{activeTrip.decision.question}</small>
            <div className="status-control" aria-label={`${activeTrip.decision.name} status`}>
              {(["pending", "positive", "negative"] as DecisionStatus[]).map((status) => (
                <button key={status} className={activeTrip.decision.status === status ? "active" : ""} onClick={() => setStatus(status)}>
                  {status === "pending" ? "Pending" : status === "positive" ? activeTrip.decision.positiveLabel : activeTrip.decision.negativeLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="decision-banner">
          <div className="decision-icon" aria-hidden="true">↳</div>
          <div>
            <span>Recommendation · {activeTrip.decision.status}</span>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.rationale}</p>
          </div>
          <button className="button button-light" onClick={() => document.getElementById(`branch-${recommendation.branchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>View recommendation</button>
        </div>

        <div className="planning-grid">
          <div className="comparison-area">
            <div className="comparison-toolbar">
              <div className="branch-select">
                <span>Compare</span>
                {activeTrip.branches.map((branch, index) => (
                  <button key={branch.id} onClick={() => toggleBranch(branch.id)} className={selected.includes(branch.id) ? "selected" : ""} aria-pressed={selected.includes(branch.id)}>
                    <i style={{ background: branchAccents[index] }} />{String.fromCharCode(65 + index)}
                  </button>
                ))}
              </div>
              <label className="switch"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} /><span />Differences only</label>
            </div>

            <div className="branch-grid" style={{ "--branch-count": comparedBranches.length } as React.CSSProperties}>
              {comparedBranches.map((branch) => {
                const index = activeTrip.branches.findIndex((item) => item.id === branch.id);
                const isRecommended = branch.id === recommendation.branchId;
                const isCommitted = branch.id === activeTrip.committedBranchId;
                return (
                  <article className={`branch-card ${isRecommended ? "recommended" : ""}`} id={`branch-${branch.id}`} key={branch.id} style={{ "--accent": branchAccents[index] } as React.CSSProperties}>
                    <div className="branch-topline"><span>PLAN {String.fromCharCode(65 + index)}</span><div>{isRecommended && <b>Recommended</b>}{isCommitted && <b className="chosen-badge">Chosen</b>}</div></div>
                    <h3>{branch.name}</h3>
                    <p className="branch-subtitle">{branch.subtitle}</p>
                    <p className="branch-summary">{branch.summary}</p>
                    <div className="metrics">
                      <div><strong>{branch.days}</strong><span>days</span></div>
                      <div><strong>{money.format(branch.cost)}</strong><span>est. cost</span></div>
                      <div><strong>{branch.driveHours}h</strong><span>driving</span></div>
                      <div><strong>{branch.fatigue}/10</strong><span>fatigue</span><i className="meter"><i style={{ width: `${branch.fatigue * 10}%` }} /></i></div>
                    </div>
                    <div className="score-row"><span>Experience score</span><strong>{branch.experienceScore}/10</strong><div className="score-dots">{Array.from({ length: 10 }, (_, dot) => <i className={dot < branch.experienceScore ? "filled" : ""} key={dot} />)}</div></div>
                    <div className="change-block"><span>What changes</span><ul>{branch.changes.map((change) => <li key={change}>{change}</li>)}</ul></div>
                    {!differencesOnly && <div className="timeline">{branch.timeline.map((item) => <div className="timeline-day" key={`${branch.id}-${item.day}`}><span>{item.day}</span><i /><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}</div>}
                    <div className="tradeoff-block"><span>You trade away</span><div>{branch.tradeoffs.map((item) => <b key={item}>{item}</b>)}</div></div>
                    <button className={`choose-button ${isCommitted ? "active" : ""}`} onClick={() => commitBranch(branch.id)}>{isCommitted ? "Selected plan ✓" : "Choose this plan"}</button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="action-panel" id="actions">
            <div className="action-heading"><span>Decision desk</span><b>{activeTrip.checklist.filter((item) => item.done).length}/{activeTrip.checklist.length}</b></div>
            <h3>What to do next</h3>
            <p>Due dates are reminders, not live availability. Verify bookings and official conditions before paying.</p>
            <div className="recommended-actions">{recommendation.actions.map((action) => <div key={action}><span>→</span>{action}</div>)}</div>
            <div className="checklist">
              {activeTrip.checklist.map((item) => (
                <label className={item.done ? "done" : ""} key={item.id}>
                  <input type="checkbox" checked={item.done} onChange={() => updateActive((trip) => ({ ...trip, checklist: trip.checklist.map((check) => check.id === item.id ? { ...check, done: !check.done } : check) }))} />
                  <span><b>{item.label}</b><small>{item.dueDate} · {item.kind}</small></span>
                </label>
              ))}
            </div>
            <button className="button button-dark panel-save" onClick={saveCurrentTrip} disabled={activeTrip.id === sampleTrip.id || isSaving}>Save this decision</button>
          </aside>
        </div>
      </section>

      <section className="how" id="how">
        <div><span className="section-number">01</span><h3>Bring the messy plan.</h3><p>Paste the itinerary, then separate must-haves, fixed bookings, constraints, and the thing that may change.</p></div>
        <div><span className="section-number">02</span><h3>Compare complete alternatives.</h3><p>See cost, driving, fatigue, daily route, changes, and what each option gives up.</p></div>
        <div><span className="section-number">03</span><h3>Resolve and act.</h3><p>Update the uncertain outcome, choose a branch, check off bookings, save it, and export the plan.</p></div>
      </section>

      <footer><div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>TripFork</span></div><p>Plan the trip—and everything that might change it.</p><span>Built for OpenAI Build Week 2026</span></footer>

      {isComposerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isGenerating && setComposerOpen(false)}>
          <section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setComposerOpen(false)} aria-label="Close">×</button>
            <span className="eyebrow">Create a decision-ready trip</span>
            <h2 id="composer-title">Bring us the messy version.</h2>
            <p>The more concrete the inputs, the more useful the comparison. You can paste an existing itinerary as-is.</p>
            <form onSubmit={generateTrip} className="trip-form">
              <div className="form-grid">
                <label><span>Trip name</span><input value={tripInput.title} onChange={(e) => setTripInput({ ...tripInput, title: e.target.value })} placeholder="Big Island in 7 days" /></label>
                <label><span>Destination *</span><input required value={tripInput.destination} onChange={(e) => setTripInput({ ...tripInput, destination: e.target.value })} placeholder="Hawaii Big Island" /></label>
                <label><span>Dates / length</span><input value={tripInput.dates} onChange={(e) => setTripInput({ ...tripInput, dates: e.target.value })} placeholder="Feb 16–23 · 7 days" /></label>
                <label><span>Travelers</span><input value={tripInput.travelers} onChange={(e) => setTripInput({ ...tripInput, travelers: e.target.value })} /></label>
                <label><span>Budget</span><input value={tripInput.budget} onChange={(e) => setTripInput({ ...tripInput, budget: e.target.value })} placeholder="$4,000 total" /></label>
                <label><span>Decision date</span><input value={tripInput.decisionDate} onChange={(e) => setTripInput({ ...tripInput, decisionDate: e.target.value })} placeholder="Lottery result Jul 18" /></label>
              </div>
              <label><span>Current route / rough notes *</span><textarea required minLength={20} rows={5} value={tripInput.notes} onChange={(e) => setTripInput({ ...tripInput, notes: e.target.value })} placeholder="Paste your current day-by-day plan, links, or the version you keep changing…" /></label>
              <div className="form-grid">
                <label><span>Must-haves</span><textarea rows={3} value={tripInput.mustHaves} onChange={(e) => setTripInput({ ...tripInput, mustHaves: e.target.value })} placeholder="Manta ray night dive, volcano, no difficult swimming" /></label>
                <label><span>Fixed bookings</span><textarea rows={3} value={tripInput.fixedBookings} onChange={(e) => setTripInput({ ...tripInput, fixedBookings: e.target.value })} placeholder="Flights, nonrefundable hotels, tour times" /></label>
                <label><span>What is uncertain? *</span><textarea required rows={3} value={tripInput.uncertainty} onChange={(e) => setTripInput({ ...tripInput, uncertainty: e.target.value })} placeholder="The Wave lottery; volcano activity; summit weather" /></label>
                <label><span>Constraints</span><textarea rows={3} value={tripInput.constraints} onChange={(e) => setTripInput({ ...tripInput, constraints: e.target.value })} placeholder="Max driving, mobility, budget, workdays" /></label>
              </div>
              <div className="composer-footer"><small>TripFork does not invent live prices, weather, permits, or availability. Verify those before booking.</small><button className="button button-dark" disabled={isGenerating}>{isGenerating ? "Building complete branches…" : "Build my comparison →"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
