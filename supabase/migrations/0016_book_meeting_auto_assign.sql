-- Who to email/invite for the Google Meet, separate from the resulting link
-- (location_detail) which the system fills in once the calendar event exists.
alter table meetings add column guest_email text;

-- Books a meeting without the caller picking a consultant: finds every active
-- consultant free at that time and assigns whoever currently has the fewest
-- meetings, keeping load balanced. Re-checks under a per-consultant advisory
-- lock so two simultaneous bookings can't race onto the same consultant.
create or replace function book_meeting_auto(
  p_lead_id uuid,
  p_start timestamptz,
  p_duration_minutes int,
  p_context_notes text,
  p_location_type text default 'google_meet',
  p_location_detail text default null,
  p_guest_email text default null
)
returns meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_candidate record;
  v_meeting meetings%rowtype;
begin
  if p_duration_minutes is null or p_duration_minutes < 15 or p_duration_minutes > 480 then
    raise exception 'Meeting length must be between 15 and 480 minutes';
  end if;

  if extract(epoch from p_start)::bigint % 900 <> 0 then
    raise exception 'Start time must fall on a 15-minute boundary';
  end if;

  if p_start < now() then
    raise exception 'That time is in the past';
  end if;

  v_end := p_start + make_interval(mins => p_duration_minutes);

  for v_candidate in
    select p.id,
      (select count(*) from meetings m where m.consultant_id = p.id) as load
    from profiles p
    where p.role = 'consultant' and p.active
      and exists (
        select 1 from availability_windows w
        where w.consultant_id = p.id
          and w.start_time <= p_start
          and w.end_time >= v_end
      )
    order by load asc, p.id
  loop
    perform pg_advisory_xact_lock(hashtext(v_candidate.id::text));

    if not exists (
      select 1 from meetings m
      where m.consultant_id = v_candidate.id
        and m.scheduled_start < v_end
        and m.scheduled_end > p_start
    ) then
      insert into meetings (
        lead_id, caller_id, consultant_id,
        scheduled_start, scheduled_end, context_notes,
        location_type, location_detail, guest_email
      )
      values (
        p_lead_id, auth.uid(), v_candidate.id,
        p_start, v_end, p_context_notes,
        p_location_type::meeting_location, p_location_detail, p_guest_email
      )
      returning * into v_meeting;

      update leads set status = 'booked', updated_at = now() where id = p_lead_id;

      return v_meeting;
    end if;
  end loop;

  raise exception 'That time was just taken across the team — pick another';
end;
$$;

revoke all on function book_meeting_auto(uuid, timestamptz, int, text, text, text, text) from public, anon;
grant execute on function book_meeting_auto(uuid, timestamptz, int, text, text, text, text) to authenticated;
