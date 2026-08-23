-- Outcomes now match what actually happens after a consultant meeting.
create type meeting_result_new as enum (
  'pending', 'onboarded', 'follow_up', 'not_interested', 'no_show'
);

alter table meetings alter column result drop default;

alter table meetings
  alter column result type meeting_result_new
  using (
    case result::text
      when 'pending'          then 'pending'
      when 'won'              then 'onboarded'
      when 'lost'             then 'not_interested'
      when 'follow_up_needed' then 'follow_up'
      when 'rescheduled'      then 'pending'
    end::meeting_result_new
  );

alter table meetings alter column result set default 'pending';

drop type meeting_result;
alter type meeting_result_new rename to meeting_result;

-- Post-meeting artefacts.
alter table meetings add column recording_url text;
alter table meetings add column analysis_output text;
alter table meetings add column completed_at timestamptz;
alter table meetings add column proposal_sent_at timestamptz;
alter table meetings add column invoice_sent_at timestamptz;
-- When the outcome is follow_up, points at the meeting that was booked next.
alter table meetings add column follow_up_meeting_id uuid references meetings(id);

create index meetings_result_idx on meetings(result);
