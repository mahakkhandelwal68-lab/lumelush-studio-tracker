-- Package a lead signed up for when a meeting closes as "onboarded".
-- Free text (not an enum) since package names are business-defined, not
-- code-defined, and change more often than a migration is worth.
alter table meetings add column package_name text;
