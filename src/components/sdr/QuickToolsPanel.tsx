import Link from "next/link";
import { Card } from "@/components/ui";
import { LeadsIcon, MeetingsIcon, PlaybookIcon, ReportsIcon } from "@/components/sdr/icons";

const TOOLS = [
  { href: "/caller/leads", label: "Leads", hint: "View and manage your lead list", icon: LeadsIcon, tone: "blue" as const },
  { href: "/caller/meetings", label: "Booked Meetings", hint: "View upcoming meetings", icon: MeetingsIcon, tone: "purple" as const },
  { href: "/caller/playbook", label: "Calling Playbook", hint: "Open the calling guide", icon: PlaybookIcon, tone: "green" as const },
  { href: "/caller/reports", label: "Reports", hint: "Track your progress", icon: ReportsIcon, tone: "red" as const },
];

const TONE_BG: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "rgba(11, 123, 238, 0.12)", fg: "var(--brand-blue)" },
  green: { bg: "rgba(79, 192, 141, 0.14)", fg: "var(--brand-mint)" },
  purple: { bg: "rgba(139, 92, 246, 0.14)", fg: "#8b5cf6" },
  red: { bg: "rgba(229, 100, 106, 0.14)", fg: "var(--status-dead)" },
};

export function QuickToolsPanel({
  stats,
}: {
  stats: { label: string; value: number }[];
}) {
  return (
    <div className="flex w-full max-w-xs shrink-0 flex-col gap-6">
      <Card className="p-4">
        <h2 className="font-display mb-3 text-base text-ink">Quick Tools</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {TOOLS.map((t) => {
            const tone = TONE_BG[t.tone];
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-xl border p-3 text-left transition hover:bg-hover"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span
                  className="mb-2 grid size-8 place-items-center rounded-lg"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  <Icon className="size-4" />
                </span>
                <p className="text-sm font-medium text-ink">{t.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{t.hint}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-display mb-3 text-base text-ink">Today&apos;s Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="data-num text-xl leading-none font-semibold text-ink">
                {s.value}
              </p>
              <p className="mt-1 text-[11px] text-ink-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
