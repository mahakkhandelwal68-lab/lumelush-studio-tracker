"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/lib/supabase/types";
import { inviteUser, setUserActive } from "@/app/admin/users/actions";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export function UsersTable({ profiles }: { profiles: Profile[] }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("caller");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteUser(email, fullName, role);
        setEmail("");
        setFullName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to invite user");
      }
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      try {
        await setUserActive(id, active);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleInvite}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="caller">Outbound Caller</option>
            <option value="consultant">Sales Consultant</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Inviting..." : "Send invite"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {profiles.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No users yet.</p>
        )}
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
              <p className="text-xs text-gray-500">
                {p.email} &middot; {p.role}
              </p>
            </div>
            <button
              onClick={() => toggleActive(p.id, !p.active)}
              disabled={isPending}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                p.active
                  ? "border border-red-300 text-red-700 hover:bg-red-50"
                  : "border border-green-300 text-green-700 hover:bg-green-50"
              }`}
            >
              {p.active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
