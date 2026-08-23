-- Short human-readable reference so callers can search/book by number
-- instead of hunting for a name in a 200-row dropdown.
create sequence lead_ref_seq start 1001;

alter table leads add column ref text;

update leads set ref = 'L-' || lpad(nextval('lead_ref_seq')::text, 5, '0')
where ref is null;

alter table leads
  alter column ref set default 'L-' || lpad(nextval('lead_ref_seq')::text, 5, '0');
alter table leads alter column ref set not null;

create unique index leads_ref_idx on leads(ref);

-- Where the meeting actually happens.
create type meeting_location as enum ('google_meet', 'phone');

alter table meetings
  add column location_type meeting_location not null default 'google_meet';
alter table meetings add column location_detail text;

-- A lead that didn't turn up goes back to the caller who booked it, in its
-- own sheet, rather than being mixed in with ordinary callbacks.
-- (Run separately: a new enum value can't be used in the same transaction.)
-- alter type lead_status add value 'no_show';
