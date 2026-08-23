"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@/lib/supabase/types";
import {
  assignLead,
  autoDistributeLeads,
  createLead,
} from "@/app/admin/leads/actions";
import { Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";

interface Lead {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  website: string | null;
  source: string | null;
  status: LeadStatus;
  assigned_caller_id: string | null;
}

interface Caller {
  id: string;
  full_name: string;
}

const STATUS_TONE: Record<
  LeadStatus,
  "new" | "callback" | "noanswer" | "dead" | "booked"
> = {
  new: "new",
  callback: "callback",
  no_answer: "noanswer",
  no_show: "noanswer",
  not_interested: "dead",
  booked: "booked",
};

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

const EMPTY_FORM = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  location: "",
  website: "",
  source: "",
};

export function LeadsTable({
  leads,
  callers,
}: {
  leads: Lead[];
  callers: Caller[];
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAssign(leadId: string, callerId: string) {
    startTransition(() => assignLead(leadId, callerId));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createLead(form);
        setForm(EMPTY_FORM);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add lead");
      }
    });
  }

  const unassignedCount = leads.filter((l) => !l.assigned_caller_id).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Add a lead"
          subtitle="These columns are what callers see in their sheet."
        />
        <form onSubmit={handleCreate} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Contact name">
              <Input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jordan Blake"
              />
            </Field>
            <Field label="Business name">
              <Input
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                placeholder="Acme Interiors"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="555-0101"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="jordan@acme.com"
              />
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Mumbai"
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="acme.com"
              />
            </Field>
            <Field label="Source">
              <Input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="web form"
              />
            </Field>
          </div>

          {error && (
            <p className="data mt-3 rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
              {error}
            </p>
          )}

          <div className="mt-4">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Adding…" : "Add lead"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="All leads"
          subtitle={`${unassignedCount} unassigned`}
          action={
            <Button
              onClick={() => startTransition(() => autoDistributeLeads())}
              disabled={isPending || unassignedCount === 0}
              size="sm"
            >
              Auto-distribute
            </Button>
          }
        />

        <div className="overflow-auto">
          {leads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-faint">
              No leads yet.
            </p>
          ) : (
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-raised">
                <tr className="border-b border-edge">
                  <th className={COL_HEAD}>Lead</th>
                  <th className={COL_HEAD}>Business</th>
                  <th className={COL_HEAD}>Phone</th>
                  <th className={COL_HEAD}>Location</th>
                  <th className={COL_HEAD}>Website</th>
                  <th className={COL_HEAD}>Status</th>
                  <th className={COL_HEAD}>Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-edge transition hover:bg-hover/60"
                  >
                    <td className="data px-3 py-3 text-sm text-ink">
                      {lead.name}
                      {lead.source && (
                        <span className="data mt-0.5 block text-xs text-ink-faint">
                          via {lead.source}
                        </span>
                      )}
                    </td>
                    <td className="data px-3 py-3 text-sm text-ink-dim">
                      {lead.business_name ?? "—"}
                    </td>
                    <td className="data-num px-3 py-3 text-sm text-ink-dim">
                      {lead.phone ?? "—"}
                    </td>
                    <td className="data px-3 py-3 text-sm text-ink-dim">
                      {lead.location ?? "—"}
                    </td>
                    <td className="data px-3 py-3 text-sm">
                      {lead.website ? (
                        <a
                          href={
                            lead.website.startsWith("http")
                              ? lead.website
                              : `https://${lead.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-teal hover:underline"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[lead.status]}>
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        defaultValue={lead.assigned_caller_id ?? ""}
                        onChange={(e) => handleAssign(lead.id, e.target.value)}
                        disabled={isPending}
                        className="min-w-[9rem] py-1.5 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {callers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
