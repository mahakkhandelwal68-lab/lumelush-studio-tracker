"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

export async function inviteUser(
  email: string,
  fullName: string,
  role: UserRole
) {
  await requireProfile("admin"); // throws/redirects if caller isn't an active admin

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm?next=/`,
  });
  if (error) throw new Error(error.message);

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    email,
    role,
  });
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin/users");
}

export async function setUserActive(profileId: string, active: boolean) {
  await requireProfile("admin");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function deleteUser(profileId: string) {
  const { profile: caller } = await requireProfile("admin");
  if (caller.id === profileId) {
    throw new Error("You can't delete your own account.");
  }

  const admin = createAdminClient();

  // Delete the auth user first — profiles.id is a FK to auth.users, so this
  // cascades the profile row too. If the auth user is already gone (edge
  // case), fall back to deleting the profile row directly.
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error && !/user not found/i.test(error.message)) {
    throw new Error(error.message);
  }

  await admin.from("profiles").delete().eq("id", profileId);

  revalidatePath("/admin/users");
}
