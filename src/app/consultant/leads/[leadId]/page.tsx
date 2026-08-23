import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { MeetingResult } from "@/lib/supabase/types";
import { parseToolLinks } from "@/lib/supabase/types";
import { Badge, Card } from "@/components/ui";
import { formatDateTime, formatTime } from "@/lib/datetime";

const RESULT_TONE: Record<
  MeetingResult,
  "neutral" | "booked" | "dead" | "callback" | "noanswer"
> = {
  pending: "neutral",
  onboarded: "booked",
  follow_up: "callback",
  not_interested: "dead",
  no_show: "noanswer",
};

const RESULT_LABEL: Record<MeetingResult, string> = {
  pending: "awaiting outcome",
  onboarded: "onboarded",
  follow_up: "follow-up",
  not_interested: "not interested",
  no_show: "no show",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const { supabase, profile } = await requireProfile("consultant");

  const [{ data: lead }, { data: meetings }, { data: tools }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
      supabase
        .from("meetings")
        .select("*, caller:profiles!meetings_caller_id_fkey(full_name)")
        .eq("lead_id", leadId)
        .eq("consultant_id", profile.id)
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("tool_resources")
        .select("*")
        .in("key", ["proposal", "invoice", "meeting_analysis"])
        .order("sort_order", { ascending: true }),
    ]);

  // RLS hides leads this consultant has no meeting with, so a missing row
  // here means "not yours" just as much as "doesn't exist".
  if (!lead || !meetings || meetings.length === 0) notFound();

  const held = meetings.filter((m) => m.result !== "pending");
  const latest = meetings[meetings.length - 1];

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/consultant"
          className="data text-xs text-ink-faint transition hover:text-ink-dim"
        >
          ← Back to meetings
        </Link>
        <h1 className="mt-2 font-display text-2xl leading-tight text-ink">
          {lead.business_name ?? lead.name}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {meetings.length} meeting{meetings.length === 1 ? "" : "s"} ·{" "}
          {held.length} held · currently{" "}
          <span className="text-ink">{RESULT_LABEL[latest.result]}</span>
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ---------------- Meeting timeline ---------------- */}
        <Card>
          <header className="border-b border-edge px-5 py-4">
            <h2 className="font-display text-lg leading-tight text-ink">
              Meeting notes
            </h2>
            <p className="mt-0.5 text-sm text-ink-dim">
              What the analysis returned after each meeting, oldest first.
            </p>
          </header>

          <div className="divide-y divide-edge">
            {meetings.map((m, i) => {
              const isFollowUp = i > 0;
              return (
                <article key={m.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="data-num grid size-6 shrink-0 place-items-center rounded-full border border-edge-strong bg-overlay text-[11px] text-ink-dim">
                      {i + 1}
                    </span>
                    <h3 className="data text-sm font-medium text-ink">
                      {isFollowUp ? `Follow-up #${i}` : "First meeting"}
                    </h3>
                    <Badge tone={RESULT_TONE[m.result]}>
                      {RESULT_LABEL[m.result]}
                    </Badge>
                  </div>

                  <p className="data-num mt-1.5 ml-8 text-xs text-ink-faint">
                    {formatDateTime(m.scheduled_start)} –{" "}
                    {formatTime(m.scheduled_end)}
                    {m.caller?.full_name && ` · booked by ${m.caller.full_name}`}
                  </p>

                  {m.context_notes && (
                    <p className="mt-2 ml-8 rounded-lg border border-edge bg-base px-3 py-2 text-xs text-ink-dim">
                      <span className="data font-medium text-ink">
                        Handover:
                      </span>{" "}
                      {m.context_notes}
                    </p>
                  )}

                  {m.analysis_output ? (
                    <div className="mt-2 ml-8 rounded-lg border border-edge bg-base px-3.5 py-3">
                      <p className="data mb-1.5 text-[11px] font-medium tracking-wide text-brand-teal uppercase">
                        Meeting analysis
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-dim">
                        {m.analysis_output}
                      </p>
                    </div>
                  ) : m.result !== "pending" ? (
                    <p className="mt-2 ml-8 text-xs text-ink-faint">
                      No analysis was recorded for this meeting.
                    </p>
                  ) : (
                    <p className="mt-2 ml-8 text-xs text-ink-faint">
                      Hasn&apos;t happened yet.
                    </p>
                  )}

                  {m.result_notes && (
                    <p className="mt-2 ml-8 text-xs text-ink-faint">
                      <span className="data font-medium text-ink-dim">
                        Your note:
                      </span>{" "}
                      {m.result_notes}
                    </p>
                  )}

                  {(m.proposal_sent_at || m.invoice_sent_at) && (
                    <p className="data-num mt-2 ml-8 flex flex-wrap gap-3 text-[11px] text-status-booked">
                      {m.proposal_sent_at && (
                        <span>proposal sent {formatDateTime(m.proposal_sent_at)}</span>
                      )}
                      {m.invoice_sent_at && (
                        <span>invoice sent {formatDateTime(m.invoice_sent_at)}</span>
                      )}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </Card>

        {/* ---------------- Sidebar ---------------- */}
        <div className="space-y-5">
          <Card>
            <header className="border-b border-edge px-5 py-4">
              <h2 className="font-display text-lg leading-tight text-ink">
                Client details
              </h2>
            </header>
            <dl className="divide-y divide-edge">
              <DetailRow label="Contact" value={lead.name} />
              <DetailRow label="Business" value={lead.business_name} />
              <DetailRow label="Phone" value={lead.phone} numeric />
              <DetailRow label="Email" value={lead.email} />
              <DetailRow label="Location" value={lead.location} />
              <DetailRow label="Website" value={lead.website} link />
              <DetailRow label="Source" value={lead.source} />
            </dl>
          </Card>

          <Card>
            <header className="border-b border-edge px-5 py-4">
              <h2 className="font-display text-lg leading-tight text-ink">
                Quick actions
              </h2>
            </header>
            <div className="flex flex-col gap-2 px-5 py-4">
              {(tools ?? []).map((tool) => {
                const primary = tool.agent_url;
                const extra = parseToolLinks(tool.links);
                if (!primary && extra.length === 0) return null;
                return (
                  <a
                    key={tool.id}
                    href={primary ?? extra[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data flex items-center justify-between rounded-lg border border-edge-strong bg-overlay px-3 py-2 text-sm text-ink-dim transition hover:bg-hover hover:text-ink"
                  >
                    {tool.title}
                    <span aria-hidden className="text-ink-faint">
                      ↗
                    </span>
                  </a>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  numeric = false,
  link = false,
}: {
  label: string;
  value: string | null;
  numeric?: boolean;
  link?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-2.5">
      <dt className="data text-xs tracking-wide text-ink-faint uppercase">
        {label}
      </dt>
      <dd
        className={`${numeric ? "data-num" : "data"} min-w-0 truncate text-sm text-ink-dim`}
      >
        {!value ? (
          <span className="text-ink-faint">—</span>
        ) : link ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-teal hover:underline"
          >
            {value.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
