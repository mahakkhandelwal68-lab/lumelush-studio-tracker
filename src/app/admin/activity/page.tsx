import { requireProfile } from "@/lib/auth";
import { formatDuration } from "@/lib/activeTime";
import { isAlwaysOnline } from "@/lib/alwaysOnline";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  consultant: "Consultant",
  caller: "SDR",
};

function sumMs(
  sessions: { started_at: string; ended_at: string | null }[],
  windowStartMs: number
) {
  const now = Date.now();
  let total = 0;
  for (const s of sessions) {
    const start = Math.max(new Date(s.started_at).getTime(), windowStartMs);
    const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
    if (end > start) total += end - start;
  }
  return total;
}

export default async function AdminActivityPage() {
  const { supabase } = await requireProfile("admin");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, active")
      .order("role")
      .order("full_name"),
    supabase
      .from("active_sessions")
      .select("user_id, started_at, ended_at")
      .or(`ended_at.is.null,ended_at.gte.${weekAgo.toISOString()}`),
  ]);

  const sessionsByUser = new Map<string, { started_at: string; ended_at: string | null }[]>();
  for (const s of sessions ?? []) {
    const list = sessionsByUser.get(s.user_id) ?? [];
    list.push(s);
    sessionsByUser.set(s.user_id, list);
  }

  const rows = (profiles ?? []).map((p) => {
    const userSessions = sessionsByUser.get(p.id) ?? [];
    return {
      ...p,
      onlineNow: userSessions.some((s) => s.ended_at === null) || isAlwaysOnline(p.id),
      activeToday: sumMs(userSessions, startOfToday.getTime()),
      activeThisWeek: sumMs(userSessions, weekAgo.getTime()),
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-display text-2xl leading-tight text-ink">Activity</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Who&apos;s online right now, and how long each person has been active —
          based on login/logout sessions, not a per-minute tracker.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-edge bg-raised">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="data border-b border-edge bg-overlay text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Active today</th>
              <th className="px-4 py-2.5">Active this week</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.map((r) => (
              <tr key={r.id} className={!r.active ? "opacity-50" : undefined}>
                <td className="px-4 py-3">
                  <p className="data font-medium text-ink">{r.full_name}</p>
                  <p className="data text-xs text-ink-faint">{r.email}</p>
                </td>
                <td className="data px-4 py-3 text-ink-dim">{ROLE_LABEL[r.role] ?? r.role}</td>
                {r.role === "admin" ? (
                  // Admin accounts are deliberately not tracked or shown as online/offline.
                  <>
                    <td className="data px-4 py-3 text-ink-faint">—</td>
                    <td className="data-num px-4 py-3 text-ink-faint">—</td>
                    <td className="data-num px-4 py-3 text-ink-faint">—</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span className="data inline-flex items-center gap-1.5 text-xs font-medium">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: r.onlineNow ? "var(--status-booked)" : "var(--border-strong)" }}
                        />
                        <span className={r.onlineNow ? "text-ink" : "text-ink-faint"}>
                          {r.onlineNow ? "Online" : "Offline"}
                        </span>
                      </span>
                    </td>
                    <td className="data-num px-4 py-3 text-ink-dim">{formatDuration(r.activeToday)}</td>
                    <td className="data-num px-4 py-3 text-ink-dim">{formatDuration(r.activeThisWeek)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
