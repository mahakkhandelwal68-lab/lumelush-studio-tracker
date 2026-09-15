"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      {success ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-dim">Your password has been updated.</p>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </Field>

          {error && (
            <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
