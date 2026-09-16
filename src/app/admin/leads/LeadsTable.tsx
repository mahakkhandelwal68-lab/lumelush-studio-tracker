"use client";

import { useMemo, useState, useTransition } from "react";
import type { LeadStatus } from "@/lib/supabase/types";
import {
  assignLead,
  assignLeadsBulk,
  autoDistributeLeads,
  createLead,
} from "@/app/admin/leads/actions";
import { Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";

interface Lead {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  alt_phone: string | null;
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
  altPhone: "",
  email: "",
  location: "",
  website: "",
  source: "",
};

function websiteHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function websiteLabel(url: string) {
  return url.replace(/^https?:\/\//, "");
}

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
  const [tab, setTab] = useState<"new" | "assigned">("new");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCallerId, setBulkCallerId] = useState("");

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

  const newLeads = useMemo(() => leads.filter((l) => !l.assigned_caller_id), [leads]);
  const assignedLeads = useMemo(() => leads.filter((l) => l.assigned_caller_id), [leads]);
  const visibleLeads = tab === "new" ? newLeads : assignedLeads;

  const allVisibleSelected =
    visibleLeads.length > 0 && visibleLeads.every((l) => selectedIds.has(l.id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const l of visibleLeads) next.delete(l.id);
        return next;
      }
      const next = new Set(prev);
      for (const l of visibleLeads) next.add(l.id);
      return next;
    });
  }

  function handleBulkAssign() {
    const ids = [...selectedIds].filter((id) => newLeads.some((l) => l.id === id));
    if (ids.length === 0 || !bulkCallerId) return;
    startTransition(async () => {
      await assignLeadsBulk(ids, bulkCallerId);
      setSelectedIds(new Set());
      setBulkCallerId("");
    });
  }

  function switchTab(next: "new" | "assigned") {
    setTab(next);
    setSelectedIds(new Set());
  }

  const selectedCount = [...selectedIds].filter((id) =>
    newLeads.some((l) => l.id === id)
  ).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Add a lead"
          subtitle="These columns are what SDRs see in their sheet."
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
            <Field label="Other phone">
              <Input
                value={form.altPhone}
                onChange={(e) => set("altPhone", e.target.value)}
                placeholder="555-0102"
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
            <Field label="Website / social">
              <Input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="acme.com or instagram.com/acme"
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
        <div className="flex items-center justify-between border-b border-edge px-5 pt-4">
          <div className="flex gap-1">
            <button
              onClick={() => switchTab("new")}
              className={`data rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${
                tab === "new"
                  ? "border-x border-t border-edge bg-raised text-ink"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              New leads ({newLeads.length})
            </button>
            <button
              onClick={() => switchTab("assigned")}
              className={`data rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${
                tab === "assigned"
                  ? "border-x border-t border-edge bg-raised text-ink"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              Assigned leads ({assignedLeads.length})
            </button>
          </div>
          {tab === "new" && (
            <Button
              onClick={() => startTransition(() => autoDistributeLeads())}
              disabled={isPending || newLeads.length === 0}
              size="sm"
            >
              Auto-distribute
            </Button>
          )}
        </div>

        {tab === "new" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-overlay/50 px-5 py-2.5">
            <span className="data text-xs text-ink-dim">
              {selectedCount > 0 ? `${selectedCount} selected` : "Select leads to assign"}
            </span>
            <Select
              value={bulkCallerId}
              onChange={(e) => setBulkCallerId(e.target.value)}
              disabled={isPending || selectedCount === 0}
              className="min-w-[10rem] py-1.5 text-xs"
            >
              <option value="">Choose an SDR…</option>
              {callers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
            <Button
              onClick={handleBulkAssign}
              disabled={isPending || selectedCount === 0 || !bulkCallerId}
              size="sm"
            >
              Assign selected
            </Button>
          </div>
        )}

        <div className="overflow-auto">
          {visibleLeads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-faint">
              {tab === "new" ? "No new leads." : "No leads assigned yet."}
            </p>
          ) : (
            <table className="w-full min-w-[1200px] border-collapse">
              <thead className="bg-raised">
                <tr className="border-b border-edge">
                  {tab === "new" && (
                    <th className={COL_HEAD}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="size-3.5 accent-brand-teal"
                      />
                    </th>
                  )}
                  <th className={COL_HEAD}>Lead</th>
                  <th className={COL_HEAD}>Business</th>
                  <th className={COL_HEAD}>Phone</th>
                  <th className={COL_HEAD}>Other phone</th>
                  <th className={COL_HEAD}>Email</th>
                  <th className={COL_HEAD}>Location</th>
                  <th className={COL_HEAD}>Website / social</th>
                  <th className={COL_HEAD}>Status</th>
                  <th className={COL_HEAD}>Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-edge transition hover:bg-hover/60"
                  >
                    {tab === "new" && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                          className="size-3.5 accent-brand-teal"
                        />
                      </td>
                    )}
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
                    <td className="data-num px-3 py-3 text-sm text-ink-dim">
                      {lead.alt_phone ?? "—"}
                    </td>
                    <td className="data px-3 py-3 text-sm text-ink-dim">
                      {lead.email ?? "—"}
                    </td>
                    <td className="data px-3 py-3 text-sm text-ink-dim">
                      {lead.location ?? "—"}
                    </td>
                    <td className="data px-3 py-3 text-sm">
                      {lead.website ? (
                        <a
                          href={websiteHref(lead.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-teal hover:underline"
                        >
                          {websiteLabel(lead.website)}
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
