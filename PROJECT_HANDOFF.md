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

Exactly 3 accounts exist, on the `lumelush.com` domain, all password
`lumelush@123`:
- `admin@lumelush.com`
- `caller@lumelush.com`
- `sarah@lumelush.com` (consultant)

There used to be more (from an old seed script default of 3 callers + 2
consultants + 2 admins) — they were deliberately deleted down to one of each
role. `scripts/seed.ts` has been updated to match this reduced team; re-running
it (`npm run seed`) will not recreate the old extra accounts.

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
