"use client";

import { useState } from "react";

export function MeetingLinkCell({
  locationType,
  locationDetail,
}: {
  locationType: "google_meet" | "phone";
  locationDetail: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (locationType === "phone") {
    return locationDetail ? (
      <p className="data-num text-xs text-ink-dim">📞 {locationDetail}</p>
    ) : (
      <p className="text-xs text-ink-faint">—</p>
    );
  }

  if (!locationDetail) {
    return <p className="text-xs text-ink-faint">Meet link generating…</p>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={locationDetail}
        target="_blank"
        rel="noopener noreferrer"
        className="data max-w-[12rem] truncate text-xs text-brand-teal hover:underline"
      >
        {locationDetail}
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(locationDetail);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded border border-edge-strong bg-overlay px-1.5 py-0.5 text-[10px] text-ink-dim transition hover:bg-hover"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
