import { requireProfile } from "@/lib/auth";
import { ChatApp } from "@/components/chat/ChatApp";

export default async function CallerChatPage() {
  const { supabase, profile } = await requireProfile("caller");

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("active", true)
    .neq("id", profile.id)
    .order("full_name");

  return (
    <ChatApp
      currentUser={{ id: profile.id, full_name: profile.full_name }}
      contacts={contacts ?? []}
    />
  );
}
