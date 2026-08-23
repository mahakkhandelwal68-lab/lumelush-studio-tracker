-- Spreadsheet-style lead columns: business name, location, website
-- (phone/email/source already existed).
alter table leads add column business_name text;
alter table leads add column location text;
alter table leads add column website text;
