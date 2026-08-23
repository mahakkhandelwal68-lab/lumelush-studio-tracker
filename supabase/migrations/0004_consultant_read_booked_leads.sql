-- A consultant must be able to see lead details (name/phone/email) for
-- meetings booked with them, but no other leads. Without this, the consultant
-- dashboard rendered "Unknown lead / No contact info" because the join to
-- `leads` was silently filtered out by RLS.
create policy "leads_consultant_read_booked" on leads for select
  using (
    exists (
      select 1 from meetings
      where meetings.lead_id = leads.id
        and meetings.consultant_id = auth.uid()
    )
  );
