import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { NotificationsCard } from "@/components/sdr/SettingsClient";

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ background: "rgba(11, 123, 238, 0.12)", color: "var(--brand-blue)" }}
        >
          {icon}
        </span>
        <div>
          <h2 className="font-display text-base leading-tight text-ink">{title}</h2>
          <p className="text-xs text-ink-faint">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default async function CallerSettingsPage() {
  const { profile } = await requireProfile("caller");

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl leading-tight text-ink">Settings</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Manage your account and preferences.
          </p>
        </div>
        <div
          className="rounded-xl px-4 py-2.5 text-center text-sm font-display italic"
          style={{ background: "rgba(63,191,143,0.12)", border: "1px solid rgba(63,191,143,0.3)", color: "var(--brand-mint)" }}
        >
          &ldquo;Small settings. Big conversations.&rdquo;
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={<UserGlyph />} title="Your Profile" subtitle="Your personal information.">
          <div className="flex items-center gap-4">
            <span
              className="grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold"
              style={{ background: "var(--brand-blue)", color: "#fff" }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight text-ink">{profile.full_name}</p>
              <p className="text-sm text-ink-faint">{profile.email}</p>
              <p className="mt-1.5 text-xs text-ink-faint">
                Joined {formatDateTime(profile.created_at)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<BellGlyph />} title="Notifications" subtitle="Choose what you want to be notified about.">
          <NotificationsCard />
          <p className="mt-3 text-[11px] text-ink-faint">
            These preferences aren&apos;t wired to real notifications yet — coming soon.
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={<HelpGlyph />} title="Need Help?" subtitle="Get support for any questions or issues.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/caller/playbook"
              className="rounded-xl border p-3.5 text-center text-sm transition hover:bg-hover"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="font-medium text-ink">Open Playbook</p>
              <p className="mt-0.5 text-xs text-ink-faint">Guides, scripts and resources</p>
            </Link>
            <Link
              href="/caller/chat"
              className="rounded-xl border p-3.5 text-center text-sm transition hover:bg-hover"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="font-medium text-ink">Contact Admin</p>
              <p className="mt-0.5 text-xs text-ink-faint">Get help from the team</p>
            </Link>
            <Link
              href="/caller/chat"
              className="rounded-xl border p-3.5 text-center text-sm transition hover:bg-hover"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="font-medium text-ink">Report a Problem</p>
              <p className="mt-0.5 text-xs text-ink-faint">Something not working?</p>
            </Link>
          </div>
        </SectionCard>

        <SectionCard icon={<ShieldGlyph />} title="Account" subtitle="Manage your account security.">
          <div className="space-y-2.5">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition hover:bg-hover"
                style={{ borderColor: "var(--border-subtle)", color: "var(--status-dead)" }}
              >
                Sign Out
                <span className="text-ink-faint">›</span>
              </button>
            </form>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    </svg>
  );
}
function BellGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 8a5 5 0 0 1 10 0c0 3.5 1.2 4.5 1.2 4.5H3.8S5 11.5 5 8Z" />
      <path d="M8.2 15a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  );
}
function HelpGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7.8 7.8a2.2 2.2 0 1 1 3.3 1.9c-.8.5-1.1.9-1.1 1.8" strokeLinecap="round" />
      <path d="M10 14.2v.1" strokeLinecap="round" />
    </svg>
  );
}
function ShieldGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 2.5 4 5v5c0 4 2.5 6.5 6 7.5 3.5-1 6-3.5 6-7.5V5l-6-2.5Z" />
    </svg>
  );
}
