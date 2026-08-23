import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardHeader } from "@/components/ui";
import { formatTime, isoToInputValue, inputValueToISO } from "@/lib/datetime";

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

/** Each ping represents roughly one minute of active heartbeat interval —
 * see src/components/ActivityTracker.tsx for how/when pings are sent. */
function formatActiveMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default async function AdminActivityPage() {
  const { supabase } = await requireProfile("admin");

  const todayKey = isoToInputValue(new Date().toISOString()).split("T")[0];
  const startIso = inputValueToISO(`${todayKey}T00:00`);
  const endIso = new Date(
    new Date(startIso).getTime() + 24 * 60 * 60 * 1000
  ).toISOString();
  const nowIso = new Date().toISOString();

  const [{ data: staff }, { data: pings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["caller", "consultant"])
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("activity_pings")
      .select("user_id, pinged_at")
      .gte("pinged_at", startIso)
      .lt("pinged_at", endIso),
  ]);

  const byUser = new Map<string, { count: number; lastSeen: string }>();
  for (const p of pings ?? []) {
    const entry = byUser.get(p.user_id);
    if (entry) {
      entry.count += 1;
      if (p.pinged_at > entry.lastSeen) entry.lastSeen = p.pinged_at;
    } else {
      byUser.set(p.user_id, { count: 1, lastSeen: p.pinged_at });
    }
  }

  const ONLINE_WITHIN_MS = 90_000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          Activity
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Active time today ({todayKey}), based on a heartbeat sent every
          minute while a caller or consultant is actively using the app —
          it pauses after 5 minutes without mouse/keyboard/scroll activity
          or when the tab isn&apos;t visible.
        </p>
      </div>

      <Card>
        <CardHeader title="Today's active time" iconTone="mint" />
        {(staff ?? []).length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No active callers or consultants.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-edge">
                  <th className={COL_HEAD}>Name</th>
                  <th className={COL_HEAD}>Role</th>
                  <th className={COL_HEAD}>Active today</th>
                  <th className={COL_HEAD}>Last seen</th>
                  <th className={COL_HEAD}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {(staff ?? []).map((s) => {
                  const entry = byUser.get(s.id);
                  const onlineNow =
                    !!entry &&
                    new Date(nowIso).getTime() -
                      new Date(entry.lastSeen).getTime() <
                      ONLINE_WITHIN_MS;
                  return (
                    <tr key={s.id} className="align-top">
                      <td className="data px-3 py-3 text-sm text-ink">
                        {s.full_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-dim capitalize">
                        {s.role}
                      </td>
                      <td className="data-num px-3 py-3 text-sm text-ink-dim">
                        {entry ? formatActiveMinutes(entry.count) : "—"}
                      </td>
                      <td className="data-num px-3 py-3 text-sm text-ink-dim">
                        {entry ? formatTime(entry.lastSeen) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {onlineNow ? (
                          <Badge tone="booked">online now</Badge>
                        ) : (
                          <Badge tone="neutral">offline</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
