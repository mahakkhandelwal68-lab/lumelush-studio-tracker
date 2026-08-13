-- Atomically books an open slot + creates the meeting + updates lead status.
-- Locks the slot row so two callers can't book the same slot at once.
create or replace function book_meeting(
  p_lead_id uuid,
  p_slot_id uuid,
  p_context_notes text
)
returns meetings
language plpgsql
security definer
as $$
declare
  v_slot availability_slots%rowtype;
  v_meeting meetings%rowtype;
begin
  select * into v_slot
  from availability_slots
  where id = p_slot_id
  for update; -- lock the row for the duration of this transaction

  if not found then
    raise exception 'Slot not found';
  end if;

  if v_slot.is_booked then
    raise exception 'Slot already booked';
  end if;

  update availability_slots set is_booked = true where id = p_slot_id;

  insert into meetings (lead_id, caller_id, consultant_id, slot_id, scheduled_start, scheduled_end, context_notes)
  values (p_lead_id, auth.uid(), v_slot.consultant_id, p_slot_id, v_slot.start_time, v_slot.end_time, p_context_notes)
  returning * into v_meeting;

  update leads set status = 'booked', updated_at = now() where id = p_lead_id;

  return v_meeting;
end;
$$;

grant execute on function book_meeting(uuid, uuid, text) to authenticated;
