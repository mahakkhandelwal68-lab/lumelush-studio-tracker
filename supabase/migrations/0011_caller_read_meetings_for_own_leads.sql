-- A caller could only see meetings they personally booked. Follow-ups booked
-- by the consultant were invisible to them, so their lead's meeting history
-- looked incomplete. Scope it to the lead instead of the booker.
create policy "meetings_caller_read_own_leads" on meetings for select
  using (
    exists (
      select 1 from leads
      where leads.id = meetings.lead_id
        and leads.assigned_caller_id = auth.uid()
    )
  );
