"use client";

import { useState } from "react";
import Link from "next/link";

export function GuideActions({ guideId }: { guideId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="guide-actions">
      <Link className="button button-dark" href={`/?fork=${encodeURIComponent(guideId)}`}>Fork this trip / 用这条路线开始规划 →</Link>
      <button className="button button-quiet" type="button" onClick={copyLink}>{copied ? "Link copied ✓" : "Copy guide link"}</button>
    </div>
  );
}
