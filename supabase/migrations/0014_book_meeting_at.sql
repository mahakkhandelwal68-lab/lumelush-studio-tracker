drop function if exists book_meeting(uuid, uuid, text);

-- Books a meeting at an arbitrary start time. Validates that the time sits
-- inside one of the consultant's open windows and doesn't collide with an
-- existing booking. A transaction-scoped advisory lock per consultant
-- serialises concurrent bookings so two callers can't take the same time.
create or replace function book_meeting_at(
  p_lead_id uuid,
  p_consultant_id uuid,
  p_start timestamptz,
  p_duration_minutes int,
  p_context_notes text
)
returns meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_meeting meetings%rowtype;
begin
  if p_duration_minutes is null or p_duration_minutes < 15 or p_duration_minutes > 480 then
    raise exception 'Meeting length must be between 15 and 480 minutes';
  end if;

  -- Only 15-minute boundaries, so the picker and the data stay in step.
  if extract(epoch from p_start)::bigint % 900 <> 0 then
    raise exception 'Start time must fall on a 15-minute boundary';
  end if;

  if p_start < now() then
    raise exception 'That time is in the past';
  end if;

  v_end := p_start + make_interval(mins => p_duration_minutes);

  perform pg_advisory_xact_lock(hashtext(p_consultant_id::text));

  if not exists (
    select 1 from availability_windows w
    where w.consultant_id = p_consultant_id
      and w.start_time <= p_start
      and w.end_time   >= v_end
  ) then
    raise exception 'That time is outside the consultant''s availability';
  end if;

  if exists (
    select 1 from meetings m
    where m.consultant_id = p_consultant_id
      and m.scheduled_start < v_end
      and m.scheduled_end   > p_start
  ) then
    raise exception 'That time was just taken - pick another';
  end if;

  insert into meetings (
    lead_id, caller_id, consultant_id,
    scheduled_start, scheduled_end, context_notes
  )
  values (
    p_lead_id, auth.uid(), p_consultant_id,
    p_start, v_end, p_context_notes
  )
  returning * into v_meeting;

  update leads set status = 'booked', updated_at = now() where id = p_lead_id;

  return v_meeting;
end;
$$;

revoke all on function book_meeting_at(uuid, uuid, timestamptz, int, text) from public, anon;
grant execute on function book_meeting_at(uuid, uuid, timestamptz, int, text) to authenticated;
