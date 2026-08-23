"use client";

import { useMemo, useState } from "react";
import type { LeadStatus } from "@/lib/supabase/types";
import { Card, CardHeader, Input } from "@/components/ui";
import { BookMeetingModal } from "@/app/caller/BookMeetingModal";

interface Lead {
  id: string;
  ref: string;
  name: string;
  email: string | null;
  business_name: string | null;
  status: LeadStatus;
}

interface Consultant {
  id: string;
  full_name: string;
}

export function BookingCard({
  leads,
  consultants,
}: {
  leads: Lead[];
  consultants: Consultant[];
}) {
  // Anything not already booked or written off is bookable.
  const bookable = useMemo(
    () =>
      leads.filter(
        (l) => l.status !== "booked" && l.status !== "not_interested"
      ),
    [leads]
  );

  const [query, setQuery] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  // Searching by reference number is the fast path once the list is long;
  // name and business still match for when the caller only knows those.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return bookable
      .filter(
        (l) =>
          l.ref.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          (l.business_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [bookable, query]);

  return (
    <>
      <Card>
        <CardHeader
          title="Book a meeting"
          subtitle="Search by lead number, name or business."
          iconTone="blue"
          icon={
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="4.5" width="14" height="12" rx="2" />
              <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
            </svg>
          }
        />

        <div className="space-y-2 px-5 py-4">
          {bookable.length === 0 ? (
            <p className="text-sm text-ink-faint">
              No leads ready to book right now.
            </p>
          ) : (
            <>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="L-01042, or a name…"
              />

              {query.trim() !== "" && (
                <div className="space-y-1.5">
                  {matches.length === 0 ? (
                    <p className="px-1 text-xs text-ink-faint">
                      No bookable lead matches that.
                    </p>
                  ) : (
                    matches.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setOpenLead(l);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-edge bg-base px-3 py-2 text-left transition hover:border-edge-strong hover:bg-overlay"
                      >
                        <span className="data-num shrink-0 rounded border border-edge-strong bg-overlay px-1.5 py-0.5 text-[10px] text-ink-faint">
                          {l.ref}
                        </span>
                        <span className="min-w-0">
                          <span className="data block truncate text-sm text-ink">
                            {l.business_name ?? l.name}
                          </span>
                          {l.business_name && (
                            <span className="data block truncate text-xs text-ink-faint">
                              {l.name}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <p className="px-1 text-xs text-ink-faint">
                {bookable.length} leads available to book
              </p>
            </>
          )}
        </div>
      </Card>

      {openLead && (
        <BookMeetingModal
          lead={openLead}
          consultants={consultants}
          onClose={() => setOpenLead(null)}
        />
      )}
    </>
  );
}
