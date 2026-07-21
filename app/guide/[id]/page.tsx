import type { Metadata } from "next";
import Link from "next/link";
import { getGuide } from "@/db";
import { findFeaturedGuide } from "@/lib/featured-guides";
import type { PublishedGuide } from "@/lib/guide-types";
import { inferRoutePoints } from "@/lib/route-points";
import { RouteMap } from "@/app/route-map";
import { GuideActions } from "@/app/guide-actions";

export const runtime = "edge";

async function loadGuide(id: string): Promise<PublishedGuide | null> {
  const featured = findFeaturedGuide(id);
  if (featured) return featured;
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return null;
  const { env } = await import("cloudflare:workers");
  return getGuide(env.DB, id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const guide = await loadGuide(id);
  if (!guide) return { title: "Guide not found — TripFork" };
  return {
    title: `${guide.title} — TripFork`,
    description: guide.summary,
    openGraph: { title: guide.title, description: guide.summary, type: "article", images: ["/og-community.png"] },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.summary, images: ["/og-community.png"] },
  };
}

export default async function PublishedGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await loadGuide(id);
  if (!guide) {
    return <main className="guide-not-found"><div className="brand">TripFork</div><h1>This guide could not be found.</h1><Link href="/">Return to TripFork</Link></main>;
  }
  const points = guide.branch.routePoints ?? inferRoutePoints(`${guide.destination} ${guide.forkInput.places} ${guide.story}`, guide.branch.transportMode, guide.branch.id);

  return (
    <main className="published-guide">
      <header className="guide-site-header">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>TripFork</span></Link>
        <span>Community travel guide</span>
        <Link href="/">Compare a different trip ↗</Link>
      </header>

      <article>
        <header className="guide-hero">
          <div className="guide-hero-copy">
            <div className="guide-author-line"><span>{guide.editorVerified ? "FIELD-TESTED ROUTE" : "TRAVELER-PUBLISHED"}</span><b>by {guide.author}</b></div>
            <h1>{guide.title}</h1>
            <p>{guide.summary}</p>
            <GuideActions guideId={guide.id} />
          </div>
          <div className="guide-stamp-card">
            <span>{guide.destination}</span>
            <strong>{guide.duration}</strong>
            <small>{guide.tripDate}</small>
            <div><b>{guide.actualCost}</b><span>actual trip cost</span></div>
          </div>
        </header>

        <section className="guide-story-grid">
          <div className="guide-story"><span className="eyebrow">Why this route works</span><h2>The version that was actually traveled.</h2><p>{guide.story}</p><blockquote>{guide.bestFor}</blockquote></div>
          {points && points.length > 1 && <RouteMap points={points} accent="#ff7048" title="Actual route" disclaimer="Approximate route · verify live conditions" />}
        </section>

        <section className="guide-itinerary">
          <div className="guide-section-heading"><span className="eyebrow">Day by day</span><h2>{guide.branch.name}</h2><p>{guide.branch.summary}</p></div>
          <div className="guide-days">{guide.branch.timeline.map((day) => <div key={`${day.day}-${day.title}`}><span>{day.day}</span><h3>{day.title}</h3><p>{day.detail}</p></div>)}</div>
        </section>

        <section className="guide-notes-grid">
          <div><span className="eyebrow">Worth protecting</span><h2>Highlights</h2><ul>{guide.highlights.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>
          <div><span className="eyebrow">Learned on the road</span><h2>Author’s notes</h2><ul>{guide.tips.map((item) => <li key={item}>→ {item}</li>)}</ul></div>
          <div><span className="eyebrow">The honest tradeoff</span><h2>What this route gives up</h2><ul>{guide.branch.tradeoffs.map((item) => <li key={item}>− {item}</li>)}</ul></div>
        </section>

        <section className="guide-final-cta">
          <span>DON’T COPY IT BLINDLY</span><h2>Fork it into a trip that fits you.</h2><p>Change the starting city, dates, budget, pace and must-see stops. TripFork will compare complete alternatives without changing this original guide.</p><GuideActions guideId={guide.id} />
          {guide.sourceUrl && <a className="guide-source" href={guide.sourceUrl} target="_blank" rel="noreferrer">Read the original story on She Leaves Notes ↗</a>}
        </section>
      </article>
    </main>
  );
}
