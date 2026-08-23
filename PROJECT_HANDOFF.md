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
| **Vercel** | Hosting, auto-deploys on push | Project **`lumelush-studio-crm`** (note: NOT `lumelush-crm` — that's a dead leftover project from an earlier failed manual-upload attempt; ignore or ask the user to delete it). Linked to the GitHub repo's `master` branch. Vercel MCP connector — already authorized. Live at **https://lumelush-studio-crm.vercel.app**. |

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
  `0020_meeting_package_name.sql` — next one starts at `0021`). This is
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
- `consultant@lumelush.com`

There used to be more (from an old seed script default of 3 callers + 2
consultants + 2 admins) — they were deliberately deleted down to one of each
role. `scripts/seed.ts` has been updated to match this reduced team; re-running
it (`npm run seed`) will not recreate the old extra accounts.

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
