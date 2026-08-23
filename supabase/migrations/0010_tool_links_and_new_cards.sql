-- Some cards need several links (e.g. three package decks), so links move
-- into an array alongside the single primary agent_url.
alter table tool_resources
  add column links jsonb not null default '[]'::jsonb;

-- Recordings are handed to the analysis agent outside the CRM; the CRM only
-- stores the analysis the agent returns.
alter table meetings drop column recording_url;

-- Seeds for the two new cards (package decks + meeting playbook) carry sample
-- copy that admins replace from Admin -> Tools.
