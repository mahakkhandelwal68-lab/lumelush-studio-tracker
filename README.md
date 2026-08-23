# CRM prototype (Outbound Caller role)

Next.js + Supabase CRM. This first pass implements the Outbound Caller
workflow end-to-end (lead queue, call logging, booking against consultant
availability). Admin and Consultant pages are stubs pending the next pass.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_book_meeting.sql`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, used only by the seed script, never sent to the browser
4. Install dependencies and seed test accounts:
   ```bash
   npm install
   npm run seed
   ```
   This creates three confirmed accounts (password `lumelush@123` for all):
   - `admin@lumelush.com`
   - `caller@lumelush.com` — has seeded leads
   - `consultant@lumelush.com` — has seeded open availability slots
5. Run the app:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and log in as `caller@lumelush.com`.

## What to test in the caller flow

- Lead queue lists only leads assigned to the logged-in caller (RLS-enforced).
- "Log call" records an outcome + notes and updates the lead's status.
- "Book meeting" picks a consultant, loads their open slots live, and books
  via the `book_meeting` Postgres function — which locks the slot row so two
  callers can't double-book the same slot.

## Notes

- No public signup: accounts are created via `supabase.auth.admin.createUser`
  (see `scripts/seed.ts`) or, later, an admin UI. Role lives in `profiles.role`.
- Access control is enforced at the database layer via Row Level Security
  (see `supabase/migrations/0001_init.sql`), not just in the UI.
- Next.js 16 warns that `middleware.ts` is deprecated in favor of `proxy.ts`;
  functionality is unaffected, left as-is for now.
