// Small stroke-based icon set for the SDR sidebar — no icon library is
// installed, and this redesign doesn't need more than a handful of glyphs.
import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Base>
  );
}

export function MeetingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </Base>
  );
}

export function PlaybookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </Base>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M21 11.5a7.5 7.5 0 0 1-11.24 6.5L3 20l1.62-4.86A7.5 7.5 0 1 1 21 11.5Z" />
    </Base>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Base>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Base>
  );
}
