-- The caller needed to patch location_detail with the real Meet link after
-- booking (the Google API call happens after the insert, in a second step).
-- There was no UPDATE policy for callers on meetings at all, so that patch
-- was being silently dropped by RLS -- no error, just 0 rows affected.
create policy "meetings_caller_update_own" on meetings for update
  using (caller_id = auth.uid())
  with check (caller_id = auth.uid());
