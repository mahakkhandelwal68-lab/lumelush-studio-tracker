import { requireProfile } from "@/lib/auth";
import { ChatApp } from "@/components/chat/ChatApp";
import { QuickToolsPanel } from "@/components/sdr/QuickToolsPanel";
import { getCallerHeaderStats } from "@/lib/callerStats";

export default async function CallerChatPage() {
  const { supabase, profile } = await requireProfile("caller");

  // Same 4 numbers the layout's header pills show — getCallerHeaderStats is
  // wrapped in React's cache(), so this reuses the layout's DB round trip
  // for this request instead of re-querying.
  const [{ data: contacts }, stats] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .neq("id", profile.id)
      .order("full_name"),
    getCallerHeaderStats(profile.id),
  ]);

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row lg:items-stretch">
      {/* Fixed vh height when stacked (below lg) so Quick Tools' own
          natural height can't squeeze Chat down to nothing in a column
          flex layout; at lg+ it switches to flex-1 to fill the row. */}
      <div className="h-[65vh] min-w-0 lg:h-auto lg:min-h-0 lg:flex-1">
        <ChatApp
          currentUser={{ id: profile.id, full_name: profile.full_name }}
          contacts={contacts ?? []}
          heightClassName="h-full"
        />
      </div>
      <QuickToolsPanel
        stats={[
          { label: "Calls Made", value: stats.callsToday },
          { label: "New Leads", value: stats.newLeads },
          { label: "Meetings Booked", value: stats.meetingsThisWeek },
          { label: "Callbacks", value: stats.callbacksDue },
        ]}
      />
    </div>
  );
}
