import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Best-effort — never block sign-out on this.
    await supabase
      .from("active_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("ended_at", null);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
