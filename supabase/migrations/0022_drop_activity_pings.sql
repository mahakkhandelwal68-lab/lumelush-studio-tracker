-- Removed: activity/heartbeat tracking was generating far more storage
-- growth than the rest of the app combined (see PROJECT_HANDOFF.md-era
-- capacity discussion). A separate tool will handle this instead.
drop table if exists activity_pings;
