-- Callers were able to pass any lead_id to book_meeting_at / book_meeting_auto,
-- not just one assigned to them — since these RPCs are SECURITY DEFINER and
-- didn't check ownership, a caller who somehow obtained another caller's lead
-- id could book (and thereby reassign the status of) a lead that wasn't
-- theirs. Consultants also call book_meeting_at (via bookFollowUp) for a
-- lead they've already met, so the check allows either path.
create or replace function public.book_meeting_at(
  p_lead_id uuid,
  p_consultant_id uuid,
  p_start timestamp with time zone,
  p_duration_minutes integer,
  p_context_notes text,
  p_location_type text default 'google_meet'::text,
  p_location_detail text default null::text,
  p_guest_email text default null::text
)
returns meetings
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  if not (private.lead_assigned_to_me(p_lead_id) or private.has_meeting_with_lead(p_lead_id)) then
    raise exception 'You are not authorized to book this lead';
  end if;

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
    location_type, location_detail, guest_email
  )
  values (
    p_lead_id, auth.uid(), p_consultant_id,
    p_start, v_end, p_context_notes,
    p_location_type::meeting_location, p_location_detail, p_guest_email
  )
  returning * into v_meeting;

  update leads set status = 'booked', updated_at = now() where id = p_lead_id;

  return v_meeting;
end;
$function$;

create or replace function public.book_meeting_auto(
  p_lead_id uuid,
  p_start timestamp with time zone,
  p_duration_minutes integer,
  p_context_notes text,
  p_location_type text default 'google_meet'::text,
  p_location_detail text default null::text,
  p_guest_email text default null::text
)
returns meetings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_end timestamptz;
  v_local_date date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_default_start timestamptz;
  v_default_end timestamptz;
  v_candidate record;
  v_meeting meetings%rowtype;
begin
  if not (private.lead_assigned_to_me(p_lead_id) or private.has_meeting_with_lead(p_lead_id)) then
    raise exception 'You are not authorized to book this lead';
  end if;

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

  for v_candidate in
    select p.id,
      (select count(*) from meetings m where m.consultant_id = p.id) as load
    from profiles p
    where p.role = 'consultant' and p.active
      and (
        exists (
          select 1 from availability_windows w
          where w.consultant_id = p.id
            and w.start_time <= p_start
            and w.end_time >= v_end
        )
        or (
          not exists (
            select 1 from availability_windows w
            where w.consultant_id = p.id
              and w.start_time < v_day_end
              and w.end_time > v_day_start
          )
          and p_start >= v_default_start
          and v_end <= v_default_end
        )
      )
      and (
        select count(*) from meetings m
        where m.consultant_id = p.id
          and m.scheduled_start >= v_day_start
          and m.scheduled_start < v_day_end
      ) < 8
    order by load asc, p.id
  loop
    perform pg_advisory_xact_lock(hashtext(v_candidate.id::text));

    if not exists (
      select 1 from meetings m
      where m.consultant_id = v_candidate.id
        and m.scheduled_start < v_end
        and m.scheduled_end > p_start
    ) and (
      select count(*) from meetings m
      where m.consultant_id = v_candidate.id
        and m.scheduled_start >= v_day_start
        and m.scheduled_start < v_day_end
    ) < 8 then
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
$function$;
