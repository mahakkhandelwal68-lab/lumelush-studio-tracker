"use client";

import { useState, useTransition } from "react";
import type { CallOutcome } from "@/lib/supabase/types";
import { logCall } from "@/app/caller/actions";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { DISPLAY_TIMEZONE, inputValueToISO, isoToInputValue } from "@/lib/datetime";
import type { Lead } from "@/app/caller/LeadsCard";

const OUTCOMES: {
  value: CallOutcome;
  label: string;
  desc: string;
  moves: string;
}[] = [
  {
    value: "interested",
    label: "Interested",
    desc: "They want to talk to a consultant.",
    moves: "Book a meeting now",
  },
  {
    value: "callback_later",
    label: "Call back later",
    desc: "They asked for a specific time.",
    moves: "→ Callbacks",
  },
  {
    value: "no_answer",
    label: "No answer",
    desc: "Didn't pick up or couldn't talk.",
    moves: "→ No answer",
  },
  {
    value: "not_interested",
    label: "Not interested",
    desc: "Said no, or clearly a dead end.",
    moves: "→ Not interested",
  },
];

function defaultCallbackTime() {
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return isoToInputValue(t.toISOString());
}

export function LogCallModal({
  lead,
  onClose,
  onBookInstead,
}: {
  lead: Lead;
  onClose: () => void;
  onBookInstead: (lead: Lead) => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome>("interested");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(defaultCallbackTime);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsFollowUp = outcome === "callback_later";
  const needsReason = outcome === "not_interested";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsFollowUp && !followUp) {
      setError("Set when you should call them back.");
      return;
    }

    startTransition(async () => {
      try {
        await logCall({
          leadId: lead.id,
          outcome,
          notes,
          followUpAt: needsFollowUp ? inputValueToISO(followUp) : null,
          notInterestedReason: needsReason ? reason : null,
        });

        // "Interested" flows straight into booking so the caller never
        // has to go find the lead again.
        if (outcome === "interested") {
          onBookInstead(lead);
        } else {
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the call");
      }
    });
  }

  return (
    <Modal
      title="Log call"
      subtitle={lead.name}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="log-call-form"
            variant="primary"
            disabled={isPending}
          >
            {isPending
              ? "Saving…"
              : outcome === "interested"
                ? "Save & book meeting"
                : "Save outcome"}
          </Button>
        </>
      }
    >
      <form id="log-call-form" onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="data mb-2 block text-xs font-medium tracking-wide text-ink-dim uppercase">
            How did it go?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OUTCOMES.map((o) => {
              const active = o.value === outcome;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-brand-teal bg-overlay"
                      : "border-edge bg-base hover:border-edge-strong hover:bg-overlay"
                  }`}
                >
                  <span className="data block text-sm font-medium text-ink">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {o.desc}
                  </span>
                  <span
                    className={`data mt-1.5 block text-[11px] ${
                      active ? "text-brand-teal" : "text-ink-faint"
                    }`}
                  >
                    {o.moves}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {needsFollowUp && (
          <Field
            label="Call back at"
            hint={`Times are in ${DISPLAY_TIMEZONE.replace("_", " ")}.`}
          >
            <Input
              type="datetime-local"
              required
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </Field>
        )}

        {needsReason && (
          <Field
            label="Why not interested?"
            hint="Helps admin spot patterns in why leads go cold."
          >
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Too expensive / using a competitor / wrong fit…"
            />
          </Field>
        )}

        <Field label="Notes">
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did they say?"
          />
        </Field>

        {error && (
          <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
