# Project handoff — read this first

This file exists so a **brand-new Claude Code session**, starting with nothing but
access to this project folder, can pick up exactly where the last session left
off. It is auto-loaded every session via the `@PROJECT_HANDOFF.md` import in
`CLAUDE.md` — you don't need to be told to read it.

If you are Claude reading this at the start of a session: read this whole file
before doing anything else. It explains what this project is, how it's wired
up across three separate platforms, and the exact workflow to keep making
changes safely.

## What this is

**LumeLush Studio CRM** — a Next.js 16 + Supabase outbound-sales CRM. Three
roles (admin / caller / consultant) with a lead-to-meeting pipeline: callers
work a lead queue and log calls, book meetings against consultant
availability; consultants take those meetings and record outcomes
(onboarded/follow-up/not-interested/no-show) with package/proposal/invoice
tracking; admins manage users, leads, and see reporting. Full detail on the
architecture and business rules lives in the code itself — the files are
commented with *why*, not just *what*, especially `src/lib/policy.ts`,
`src/lib/scheduling.ts`, and the migration files under `supabase/migrations/`.

## The three platforms this project spans

| Platform | What it's for | How you access it |
|---|---|---|
| **Supabase** | Database (Postgres), Auth, Row Level Security | Supabase MCP connector — already authorized on this account. Project ref `hnvtawqrtogdcmaoqmjg`, region `ap-southeast-1`. Use `list_projects`/`execute_sql`/`apply_migration` etc. |
| **GitHub** | Source of truth for code | Repo: `github.com/mahakkhandelwal68-lab/lumelush-studio-tracker` (public — no secrets are in it, verified). You push here with plain `git` commands. |
| **Vercel** | Hosting, auto-deploys on push | Project **`lumelush-studio-crm`** (note: NOT `lumelush-crm` — that's a dead leftover project from an earlier failed manual-upload attempt; ignore or ask the user to delete it). Linked to the GitHub repo's `master` branch. Vercel MCP connector — already authorized. Live at **https://crm.lumelush.com** (custom domain, primary — set as `NEXT_PUBLIC_SITE_URL`) and also `https://lumelush-studio-crm.vercel.app` (still works, not removed). |

## The workflow — how changes actually reach production

This is the important part. The user works entirely through chat with you;
there is no separate deploy step for them to run.

1. You edit code locally in this folder using your normal tools.
2. You commit: `git commit -m "..."`.
3. You push: `git push origin master`. **This works without asking for
   permission** — `Bash(git push:*)` is pre-approved in
   `.claude/settings.local.json`. (`git commit` and `git add` are NOT
   pre-approved and will prompt for a one-time approval each session; that's
   normal, just proceed.)
4. The push hits GitHub, which triggers Vercel's webhook, which builds and
   deploys automatically. Usually live within 1–2 minutes.
5. Verify with the Vercel MCP tools: `list_deployments` /
   `get_deployment` (poll for `state: READY`) / `get_deployment_build_logs`
   if something fails / `get_runtime_errors` if it builds but crashes at
   request time. Then actually load the live URL in the browser tool and
   click through — don't just trust a green build.

**Database changes are a separate track.** If a change needs a schema change
(new column, new table, new RLS policy, etc.):
- Apply it live via the Supabase MCP `apply_migration` tool.
- Also write the same SQL to a new file in `supabase/migrations/`, following
  the existing `NNNN_description.sql` numbering (last one so far:
  `0022_drop_activity_pings.sql` — next one starts at `0023`). This is
  belt-and-suspenders repo history, not the source of truth — the live DB is
  the source of truth.
- If the schema change affects any table shape the app queries, regenerate
  `src/lib/supabase/database.types.ts` via the Supabase MCP
  `generate_typescript_types` tool and overwrite that file, then commit it
  alongside the code change.

**New environment variables are the one thing outside this loop.** If a code
change needs a *new* env var (not just uses existing ones), you cannot set it
on Vercel yourself — no tool exposes that. Tell the user exactly which
variable to add and where (Vercel dashboard → the project → Settings →
Environment Variables), then trigger a redeploy yourself once they confirm.

## Accounts

10 accounts exist, on the `lumelush.com` domain:

| Role | Email | Password | Display name |
|---|---|---|---|
| admin | `mahak@lumelush.com` | `Lumelush@124` | Mahak K |
| admin | `ankit@lumelush.com` | `Lumelush@124` | Ankit P |
| consultant | `sarah@lumelush.com` | `Lumelush@124` | Sarah |
| consultant | `ruhi@lumelush.com` | `Lumelush@124` | Ruhi |
| consultant | `akhil@lumelush.com` | `Lumelush@124` | Akhil |
| consultant | `sumaya@lumelush.com` | `Lumelush@124` | Sumaya |
| caller | `udit@lumelush.com` | `Lumelush@124` | Udit |
| caller | `purva@lumelush.com` | `Lumelush@124` | Purva |
| caller | `karan@lumelush.com` | `Karanm@1509` | Karan |
| caller | `umang@lumelush.com` | `Lumelush@124` | Umang |

Note Karan's password is the one deliberate exception to the shared
`Lumelush@124` convention — every other account, including Sarah's (reset
this session from the older `lumelush@123`), uses it. These are **not** the
emails baked into `scripts/seed.ts` (which still has older placeholder
addresses like `admin@lumelush.com`/`caller@lumelush.com`) — accounts were
created/renamed directly via the Supabase Auth Admin API
(`createUser`/`updateUserById`), not by re-seeding. Don't trust the seed
script's emails as current; this table is the source of truth. The **role**
"caller" is called **"Outreach"** everywhere in the UI (display-only rename —
the DB role value, `/caller` URL, and internal code/column names are all
still literally `caller`, unchanged). Display names are deliberately
first-name-only (no last names) per the user's own naming convention — keep
new accounts consistent with that unless told otherwise.

Admin can invite new accounts *and* permanently delete them (not just
deactivate) from Admin → Users. Izhan (the original sole caller account) was
permanently deleted this session and replaced by the 4 caller accounts above.

## Temporary rule: Karan's bookings are pinned to Sarah

Every other caller's bookings still go through `book_meeting_auto` (the
usual load-balanced auto-assign across all consultants), but Karan's
bookings are hard-coded to always land on Sarah specifically, via
`FORCED_CONSULTANT_BY_CALLER_EMAIL` in
[src/app/caller/actions.ts](src/app/caller/actions.ts) — keyed by caller
email (`karan@lumelush.com` → `sarah@lumelush.com`) rather than a stored id,
since email is stable across account recreation. This required adding a
`p_guest_email` parameter to the `book_meeting_at` RPC (previously only
`book_meeting_auto` had one), so Karan's bookings can still carry the
client's email through to the Google Meet invite the same way everyone
else's do — see `supabase/migrations/0024_book_meeting_at_guest_email.sql`.
This is explicitly a "for now" rule the user asked for, not a permanent
product decision — remove the map entry (or repoint it) when it's no longer
needed. One caveat: the caller booking screen still shows combined
availability across *all* consultants, so Karan can still pick a time where
Sarah specifically isn't free — that booking will fail with "That time is
outside the consultant's availability" rather than silently going to
someone else. If that turns out to be a frequent annoyance, the fix would be
scoping Karan's booking screen to only show Sarah's open slots — flag it if
so, since that wasn't built.

## Consultant availability — redesigned, and a default behavior flip

The Availability page (`src/app/consultant/availability/`) was rebuilt from a
dense hour-by-hour grid into one row per day with draggable slot bars (grab
either edge to resize, "+ Add slot" to add another, "Not available" to clear
a day). Booked meetings render with the brand gradient, always on top.
Today/tomorrow show their real hours (no more "locked" striped overlay) but
only get a "Request a change" button instead of edit controls, since those
two days genuinely can't be edited directly (see `LOCK_WINDOW_HOURS` in
`src/lib/policy.ts`).

**Important:** `DEFAULT_AVAILABLE_WHEN_UNSET` in `src/lib/scheduling.ts` was
flipped from `true` to `false`. A day with **zero explicit
`availability_windows` rows now means "not available"**, not "open all day"
like before. This propagates everywhere availability is computed (caller's
booking screen, consultant's own open-slots count, follow-up booking) via
the single `windowsWithDefaults()` function. Practical implication: if a
consultant never sets their hours (or a new consultant is added), **nothing
is bookable for them at all** until they do — this is intentional, not a
bug, but it means a newly onboarded consultant needs to set real hours
before callers can book them.

## Google Calendar integration — credential history, worth knowing

The Meet-link/calendar-invite feature (`src/lib/googleCalendar.ts`) uses a
Google Cloud OAuth client (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/
`GOOGLE_REFRESH_TOKEN` in Vercel env vars). It broke once in production with
`Google token refresh failed: invalid_client` — root cause was never fully
confirmed (likely a corrupted paste into Vercel's env var UI, same class of
bug as the Supabase env var outages below) — and was fixed by generating a
fresh Client Secret + refresh token via OAuth Playground and retyping
(not pasting) them into Vercel. Verified working since, including a live
test booking that confirmed via Google's own Calendar API that both
attendees were added with `needsAction` status (the trigger for Google's
invite email).

Two things that made this durable, if it ever needs redoing:
- The Google Cloud OAuth consent screen's **Publishing status is "In
  production"** (checked in Google Auth Platform → Audience), not
  "Testing" — this matters because Testing-mode refresh tokens silently
  expire after 7 days, which would cause this exact failure to recur on a
  schedule. Production-mode tokens don't have that expiry. If this ever
  breaks again, check Publishing status first before assuming the
  credentials were corrupted again.
- Meeting titles read `"LumeLush Studio × {business name} — Consultation"`
  (falls back to contact name if no business name). The "context notes"
  field callers fill in is intentionally **never** sent to Google Calendar
  (would leak into the client's invite email) — it's only ever shown on the
  consultant's own dashboard.

## Supabase free tier pauses on inactivity — confirmed real

Watched it happen directly this session: after ~6 days with zero API/DB
activity, the Supabase project's status cycled `COMING_UP → RESTORING →
ACTIVE_HEALTHY` over about 15 seconds when queried again, and the live
site's login failed with "Failed to fetch" during that window. If the team
isn't using the CRM daily yet, this will keep happening — either touch the
project periodically (any `execute_sql` call or loading the live site) or
consider setting up a scheduled ping if the user wants it automated (they
were offered this and hadn't confirmed as of last session end).

## Capacity — both platforms are on free tier, on purpose for now

Supabase org and Vercel team are both on **free/hobby plans**. This is a
deliberate choice, not an oversight — the user's own company use is low
volume enough that free tier is fine for a long while (checked: actual DB
size was ~11MB against Supabase's 500MB cap early on). Two things worth
knowing before adding anything that writes rows frequently:

- **A per-minute "activity heartbeat" feature was built, then deliberately
  removed** (see git history: "Track caller/consultant active time" followed
  by "Remove caller/consultant activity tracking"). At real team scale
  (~15 tracked staff), it was projected to become the single largest source
  of database growth by far — more than all real lead/call/meeting data
  combined — because per-minute rows compound fast. The user wants a
  *separate* dedicated tool for time-tracking instead of building it into
  this app. Don't re-add anything with a similar "ping every N seconds/
  minutes" pattern without doing the same growth math first and getting
  explicit buy-in.
- **A second, lighter-weight take on this was added later and is live**:
  `active_sessions` (migration `0025`) stores one row per login
  (`started_at` → `ended_at`), not one row per minute — active time is
  just the difference between the two timestamps, so growth is bounded by
  login count, not elapsed time. This was explicitly requested and scoped
  by the user after being shown the growth history above, specifically to
  avoid repeating it. A 15-minute mouse/keyboard/scroll idle timer
  (`src/components/IdleAutoLogout.tsx`, mounted in all three role layouts)
  auto-signs-out and closes the session, which is also what makes "how
  long were they active" a meaningful number rather than "however long
  the browser tab happened to stay open." Every role's header shows the
  signed-in user's own "Active today"; Admin → Activity shows everyone's
  online/offline status plus active time today and this week. Real
  tracking only matters for Karan and any newly created account — the 9
  accounts that predate this feature (everyone else) got a **one-time**
  seeded backfill of plausible historical sessions (admins ~1hr/day,
  everyone else ~6hr/day, random within 10am–6pm IST, last 6 days) so
  Activity isn't empty for them; nothing keeps generating fake data for
  them going forward.
- If a future feature needs high-frequency writes, budget the storage math
  (rows/day × row size × retention) before building, and prefer aggregating
  into daily/weekly summary rows over keeping unbounded raw event logs.
- When the user is ready to actually sell this to other companies (not just
  their own internal use), they plan to upgrade both platforms to paid tiers
  first — this is a known, deliberate future step, not a gap to flag again.

## Deferred: Google Places lead-generation feature

Discussed but **not built yet** — the user wants an Admin → "Extract Leads"
page that searches Google's official Places API (Text Search) by
profession + district and imports results into the existing `leads` table.
Key facts already researched, so a future session doesn't need to re-derive
them:

- Must use the **official Places API**, not scraping — scraping Google Maps
  violates their ToS and was explicitly ruled out.
- **India-specific pricing applies** (the user's business is India-based):
  ~35,000 free monthly billable events on the Places API Pro tier, then
  ~$9.60/1,000 requests. At realistic usage (a few dozen searches/month)
  this is effectively free. Verify current numbers again before building —
  Google's pricing pages change.
- **Essentials tier doesn't include phone/website fields at all** — Pro tier
  is required for "Contact Data" fields, not an optional upgrade.
- A single API query caps around 20–60 results, not the ~120 the user wants
  per district — the feature should chain a few sub-queries (e.g. split by
  sub-area or keyword variant) behind one "search" button click to reach
  ~120 deduplicated results per search.
- The user will need to create their own Google Cloud project + Places API
  key (a new env var) — same limitation as always, only they can do that
  part.
- For now: leads are being sourced manually outside the app; this feature
  is intentionally on hold until the user decides to pick it up.

## Local dev

```bash
npm install
npm run dev
```
Needs `.env.local` (gitignored, already present locally with real Supabase +
Google Calendar credentials — never commit it, never print its contents into
chat or into a committed file).

## Tool links live in the database, not code

Admin → Tools sets `agent_url`/`agent_label` on rows in the `tool_resources`
table (keys: `proposal`, `invoice`, `meeting_analysis`, `caller_playbook`,
`package_deck`, `playbook`). These are pure data — updating them is a
Supabase `execute_sql` UPDATE, not a code change, and takes effect
immediately with no deploy. Currently: `proposal` → `https://proposal.lumelush.com/`
(the user's separate, independently-deployed proposal-generator app — kept
deliberately decoupled so if it goes down, the CRM keeps working). `invoice`
and `meeting_analysis` still point at `https://example.com/...` placeholders
— not built/connected yet.

## An untracked file sits in the repo, unexplained

`.claude/run-italian.cmd` shows up as untracked in `git status` every
session. Its purpose was never established (unrelated to this project by
name) and it hasn't been added to `.gitignore` or removed — just leave it
alone unless the user explains what it's for.

## Things that went wrong once — don't repeat them

- **`.claude/settings.local.json` is gitignored on purpose.** It accumulated
  plaintext Supabase keys pasted into permission-rule strings from old
  session commands. It's useful (holds the `git push` permission) but must
  never be committed. If you ever see it about to be staged, stop and check
  its contents first.
- **Don't use the Vercel `deploy_to_vercel` (manual file upload) tool for this
  project.** It replaces the *entire* file tree on every call — there is no
  incremental upload — and for a ~60-file app that means either transcription
  errors or hitting output limits. It was tried, it caused a genuinely broken
  deployment, and it was abandoned in favor of the GitHub-linked
  `create_git_project` flow, which is what's live now. Just use `git push`.
- **When pasting values into Vercel's Environment Variables UI, whitespace
  ruins them silently.** Two production outages this session were caused by
  a stray character in a pasted env var value (`Invalid supabaseUrl`, then
  `Invalid API key`) with no visible sign in the UI. If a fresh deployment
  500s on `/middleware` (`MIDDLEWARE_INVOCATION_FAILED`), check
  `get_runtime_errors` first — it'll usually say exactly which Supabase env
  var is malformed — then have the user clear-and-retype (not paste) that
  variable.
- **The GitHub repo is public.** Verified no secrets are in git history
  (`.env*` is gitignored from the start; `.claude/settings.local.json` was
  caught and gitignored before any secret-bearing version was committed). If
  future work touches anything sensitive, double-check `.gitignore` covers it
  *before* committing, not after.
