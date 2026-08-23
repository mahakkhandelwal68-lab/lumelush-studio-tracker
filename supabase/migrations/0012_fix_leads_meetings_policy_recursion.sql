-- The caller policy on `meetings` selected from `leads`, while the consultant
-- policy on `leads` selected from `meetings` — each policy triggered the
-- other, and Postgres aborted every query with
-- "infinite recursion detected in policy for relation leads".
--
-- Both checks now go through SECURITY DEFINER helpers. Those run as the
-- function owner, so the inner lookup skips RLS entirely and the cycle breaks.

create or replace function private.lead_assigned_to_me(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from leads
    where id = p_lead_id and assigned_caller_id = auth.uid()
  );
$$;

create or replace function private.has_meeting_with_lead(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from meetings
    where lead_id = p_lead_id and consultant_id = auth.uid()
  );
$$;

revoke all on function private.lead_assigned_to_me(uuid) from public, anon;
revoke all on function private.has_meeting_with_lead(uuid) from public, anon;
grant execute on function private.lead_assigned_to_me(uuid) to authenticated;
grant execute on function private.has_meeting_with_lead(uuid) to authenticated;

drop policy "meetings_caller_read_own_leads" on meetings;
create policy "meetings_caller_read_own_leads" on meetings for select
  using (private.lead_assigned_to_me(lead_id));

drop policy "leads_consultant_read_booked" on leads;
create policy "leads_consultant_read_booked" on leads for select
  using (private.has_meeting_with_lead(id));
