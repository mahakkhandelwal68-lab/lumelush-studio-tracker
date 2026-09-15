import { requireProfile } from "@/lib/auth";
import { ChatApp } from "@/components/chat/ChatApp";
import { QuickToolsPanel } from "@/components/sdr/QuickToolsPanel";

export default async function CallerChatPage() {
  const { supabase, profile } = await requireProfile("caller");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { data: contacts },
    { count: callsToday },
    { count: newLeads },
    { count: meetingsThisWeek },
    { count: callbacksDue },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .neq("id", profile.id)
      .order("full_name"),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("caller_id", profile.id)
      .gte("called_at", startOfToday.toISOString())
      .lt("called_at", endOfToday.toISOString()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_caller_id", profile.id)
      .eq("status", "new"),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("caller_id", profile.id)
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_caller_id", profile.id)
      .eq("status", "callback")
      .lt("follow_up_at", endOfToday.toISOString()),
  ]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <ChatApp
          currentUser={{ id: profile.id, full_name: profile.full_name }}
          contacts={contacts ?? []}
        />
      </div>
      <QuickToolsPanel
        stats={[
          { label: "Calls Made", value: callsToday ?? 0 },
          { label: "New Leads", value: newLeads ?? 0 },
          { label: "Meetings Booked", value: meetingsThisWeek ?? 0 },
          { label: "Callbacks", value: callbacksDue ?? 0 },
        ]}
      />
    </div>
  );
}
