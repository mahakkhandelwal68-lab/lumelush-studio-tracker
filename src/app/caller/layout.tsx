import { requireProfile } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { PresenceBeacon } from "@/components/PresenceBeacon";
import { IdleAutoLogout } from "@/components/IdleAutoLogout";
import { SdrNav } from "@/components/sdr/SdrNav";
import { ThemeToggle } from "@/components/sdr/ThemeToggle";
import { getCallerHeaderStats } from "@/lib/callerStats";
import { getTodayActiveMs, formatDuration } from "@/lib/activeTime";

const DAILY_CALL_TARGET = 25;

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="sdr-stat-pill flex flex-col items-center rounded-lg px-3 py-1.5">
      <span className="data-num text-base leading-none font-semibold text-ink">
        {value}
      </span>
      <span className="data text-[10px] leading-tight font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </span>
    </div>
  );
}

export default async function CallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile("caller");
  const stats = await getCallerHeaderStats(profile.id);
  const activeMs = await getTodayActiveMs(profile.id);

  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="sdr-app h-screen overflow-hidden" data-theme="light" suppressHydrationWarning>
      {/* Sets the real theme before first paint, so switching to dark
          earlier doesn't flash light on the next load. This deliberately
          diverges from the server-rendered "light" default — that's the
          point, so hydration-mismatch warnings for this attribute are
          suppressed rather than a bug to fix. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem("sdr-theme");if(t)document.currentScript.closest(".sdr-app").setAttribute("data-theme",t);}catch(e){}`,
        }}
      />
      <PresenceBeacon userId={profile.id} />
      <IdleAutoLogout userId={profile.id} />

      <div className="flex h-full">
        <aside className="sdr-sidebar flex w-[104px] shrink-0 flex-col overflow-y-auto">
          <div className="flex items-center justify-center border-b px-2 py-4" style={{ borderColor: "var(--border-subtle)" }}>
            <BrandMark compact />
          </div>
          <SdrNav />
          <div className="p-3">
            <div className="sdr-tip rounded-xl px-3 py-3 text-center text-[11px] leading-snug font-medium">
              Keep going!
              <span className="mt-0.5 block font-normal opacity-80">
                Every call creates an opportunity.
              </span>
            </div>
          </div>
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          <header
            className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-3.5"
            style={{ borderColor: "var(--border-subtle)", background: "var(--surface-raised)" }}
          >
            <div>
              <h1 className="font-display text-xl leading-tight text-ink">
                Sales Command Center
              </h1>
              <p className="text-xs text-ink-faint">
                Conversations. Opportunities. Growth.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="sdr-tip flex flex-col items-center rounded-lg px-3.5 py-1.5">
                <span className="text-[10px] leading-tight font-medium tracking-wide uppercase opacity-80">
                  Today&apos;s Target
                </span>
                <span className="data-num text-sm leading-none font-semibold">
                  {DAILY_CALL_TARGET} calls
                </span>
              </div>
              <StatPill label="Calls Made" value={stats.callsToday} />
              <StatPill label="Meetings Booked" value={stats.meetingsThisWeek} />
              <StatPill label="Call Backs" value={stats.callbacksDue} />
              <StatPill label="New Leads" value={stats.newLeads} />

              <ThemeToggle />

              <div className="flex items-center gap-2 pl-1">
                <span
                  className="data grid size-9 place-items-center rounded-full border text-xs font-semibold"
                  style={{
                    borderColor: "var(--border-strong)",
                    background: "var(--surface-overlay)",
                    color: "var(--brand-blue)",
                  }}
                >
                  {initials}
                </span>
                <div className="hidden sm:block">
                  <p className="data text-sm leading-tight text-ink">
                    {profile.full_name}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    Active today: {formatDuration(activeMs)}
                  </p>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="data text-xs text-ink-faint underline-offset-2 hover:underline"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
