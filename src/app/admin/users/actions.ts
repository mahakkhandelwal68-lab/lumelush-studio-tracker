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
