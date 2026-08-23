"use server";

import { createClient } from "@/lib/supabase/server";

/** Called by ActivityTracker roughly once a minute while a caller or
 * consultant is actively using the app. See ActivityTracker for the
 * idle/visibility logic that decides when to call this. */
export async function logActivityPing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_pings").insert({ user_id: user.id });
}
