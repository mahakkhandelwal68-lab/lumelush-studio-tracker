create or replace function book_meeting_at(
  p_lead_id uuid,
  p_consultant_id uuid,
  p_start timestamptz,
  p_duration_minutes int,
  p_context_notes text,
  p_location_type text default 'google_meet',
  p_location_detail text default null
)
returns meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_local_date date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_default_start timestamptz;
  v_default_end timestamptz;
  v_has_window boolean;
  v_day_count int;
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

  v_local_date := (p_start at time zone 'Asia/Kolkata')::date;
  v_day_start := v_local_date at time zone 'Asia/Kolkata';
  v_day_end := (v_local_date + 1) at time zone 'Asia/Kolkata';
  v_default_start := (v_local_date + time '09:00') at time zone 'Asia/Kolkata';
  v_default_end := (v_local_date + time '20:00') at time zone 'Asia/Kolkata';

  perform pg_advisory_xact_lock(hashtext(p_consultant_id::text));

  v_has_window := exists (
    select 1 from availability_windows w
    where w.consultant_id = p_consultant_id
      and w.start_time <= p_start
      and w.end_time >= v_end
  );

  if not v_has_window then
    if exists (
      select 1 from availability_windows w
      where w.consultant_id = p_consultant_id
        and w.start_time < v_day_end
        and w.end_time > v_day_start
    ) or p_start < v_default_start or v_end > v_default_end then
      raise exception 'That time is outside the consultant''s availability';
    end if;
  end if;

  select count(*) into v_day_count
  from meetings m
  where m.consultant_id = p_consultant_id
    and m.scheduled_start >= v_day_start
    and m.scheduled_start < v_day_end;

  if v_day_count >= 8 then
    raise exception 'This consultant already has 8 meetings that day';
  end if;

  if exists (
    select 1 from meetings m
    where m.consultant_id = p_consultant_id
      and m.scheduled_start < v_end
      and m.scheduled_end > p_start
  ) then
    raise exception 'That time was just taken — pick another';
  end if;

  insert into meetings (
    lead_id, caller_id, consultant_id,
    scheduled_start, scheduled_end, context_notes,
    location_type, location_detail
  )
  values (
    p_lead_id, auth.uid(), p_consultant_id,
    p_start, v_end, p_context_notes,
    p_location_type::meeting_location, p_location_detail
  )
  returning * into v_meeting;

  update leads set status = 'booked', updated_at = now() where id = p_lead_id;

  return v_meeting;
end;
$$;
