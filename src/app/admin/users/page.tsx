import { requireProfile } from "@/lib/auth";
import { UsersTable } from "@/app/admin/users/UsersTable";

export default async function AdminUsersPage() {
  const { supabase } = await requireProfile("admin");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500">
          Invite outreach and consultants, and deactivate accounts here. No
          public signup exists &mdash; this is the only way accounts get
          created.
        </p>
      </div>
      <UsersTable profiles={profiles ?? []} />
    </div>
  );
}
