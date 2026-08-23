// Builds a realistic demo dataset: 3 callers with ~65 leads each, 2
// consultants with availability, plus call history and meetings so the
// dashboards look like a team mid-week rather than an empty shell.
//
// Safe to re-run: pass --reset to wipe demo data first.
// Requires SUPABASE_SERVICE_ROLE_KEY. Run with: npm run seed
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "../src/lib/supabase/types";
import type {
  CallOutcome,
  LeadStatus,
  MeetingResult,
} from "../src/lib/supabase/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "lumelush@123";
const RESET = process.argv.includes("--reset");

// Deterministic pseudo-random so re-runs look the same.
let seed = 20260814;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;

// ---------------------------------------------------------------- team

const TEAM: { email: string; full_name: string; role: UserRole }[] = [
  { email: "admin@lumelush.com", full_name: "Aarav Mehta", role: "admin" },
  { email: "caller@lumelush.com", full_name: "Cara Caller", role: "caller" },
  { email: "consultant@lumelush.com", full_name: "Cole Consultant", role: "consultant" },
];

const CALLER_EMAILS = ["caller@lumelush.com"];
const CONSULTANT_EMAILS = ["consultant@lumelush.com"];

// ---------------------------------------------------------------- leads

const FIRST = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rudra",
  "Ananya","Diya","Saanvi","Aadhya","Kiara","Myra","Anika","Navya","Riya","Ira",
  "Rohan","Kabir","Dev","Neel","Yash","Tara","Meera","Nisha","Pooja","Sneha",
];
const LAST = [
  "Sharma","Verma","Patel","Gupta","Iyer","Nair","Reddy","Rao","Desai","Kapoor",
  "Chopra","Malhotra","Bose","Banerjee","Joshi","Shah","Mehta","Pillai","Kulkarni","Sinha",
];
const BIZ_PREFIX = [
  "Bright","Urban","Prime","Nova","Vertex","Lotus","Indigo","Crest","Summit","Aster",
  "Copper","Ember","Harbour","Ivory","Juniper","Kite","Lumen","Marble","Northwind","Onyx",
];
const BIZ_SUFFIX = [
  "Interiors","Textiles","Logistics","Studios","Foods","Retail","Health","Motors",
  "Realty","Media","Consulting","Fitness","Jewellers","Travel","Academy","Solar",
];
const CITIES = [
  "Mumbai","Delhi","Bengaluru","Pune","Hyderabad","Chennai","Ahmedabad","Jaipur",
  "Surat","Kolkata","Indore","Kochi","Chandigarh","Nagpur",
];
const SOURCES = [
  "web form","referral","cold list","trade show","Instagram","Google Ads","LinkedIn","webinar",
];

const NOT_INTERESTED_REASONS = [
  "Using a competitor already",
  "Budget too tight this quarter",
  "Not the decision maker",
  "Wrong fit for our services",
  "Asked us not to call again",
  "Business closing down",
];

const CALL_NOTES: Record<CallOutcome, string[]> = {
  interested: [
    "Keen to see pricing. Asked for a call with a consultant.",
    "Wants to expand next quarter, good fit.",
    "Asked a lot about turnaround times — genuinely interested.",
  ],
  callback_later: [
    "In a meeting, asked me to try again later.",
    "Travelling this week, said to call back after.",
    "Interested but wants to speak with their partner first.",
  ],
  no_answer: [
    "Rang out, no voicemail.",
    "Number engaged, will retry.",
    "Went to voicemail, left a short message.",
  ],
  not_interested: [
    "Said they're happy with their current supplier.",
    "Not looking at this right now.",
    "Asked to be removed from the list.",
  ],
};

const ANALYSIS_SAMPLES = [
  "Strong fit. Decision maker present, budget confirmed. Asked for a proposal covering the Growth package with a phased rollout. Next step: send proposal within 24 hours.",
  "Interested but cautious. Wants a reference from a similar business before committing. Pricing was not the blocker — timeline was. Next step: share two case studies.",
  "Good conversation, no commitment yet. They need sign-off from their finance lead. Suggested reconvening with that person present. Next step: schedule a follow-up.",
  "Not a fit right now. Their volume is well below our minimum engagement. Worth revisiting in six months if they grow. Next step: mark as not interested.",
  "Very positive. Agreed commercials verbally and asked for the invoice. Wants onboarding to start at the beginning of next month. Next step: send invoice and payment link.",
];

function makeLead(index: number) {
  const first = pick(FIRST);
  const last = pick(LAST);
  const biz = `${pick(BIZ_PREFIX)} ${pick(BIZ_SUFFIX)}`;
  const slug = biz.toLowerCase().replace(/\s+/g, "");
  return {
    name: `${first} ${last}`,
    business_name: biz,
    phone: `98${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
    email: `${first.toLowerCase()}@${slug}.in`,
    location: pick(CITIES),
    website: `${slug}.in`,
    source: pick(SOURCES),
    _index: index,
  };
}

/** Realistic spread of where leads sit in the pipeline. */
function pickStatus(): LeadStatus {
  const r = rnd();
  if (r < 0.42) return "new";
  if (r < 0.62) return "no_answer";
  if (r < 0.78) return "callback";
  if (r < 0.92) return "not_interested";
  return "booked";
}

// ------------------------------------------------------------- helpers

function atLocalTime(daysFromToday: number, hour: number, minute = 0) {
  // Server runs in UTC on CI but local here; build the instant from the
  // display timezone offset used by the app (Asia/Kolkata, +05:30).
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  return new Date(Date.UTC(y, m, day, hour - 5, minute - 30));
}

async function ensureUser(email: string, full_name: string, role: UserRole) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (!error) {
    await supabase
      .from("profiles")
      .upsert({ id: created.user.id, full_name, email, role }, { onConflict: "id" });
    return created.user.id;
  }

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`lookup ${email}: ${listError.message}`);

  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw new Error(`create ${email}: ${error.message}`);

  await supabase
    .from("profiles")
    .upsert({ id: existing.id, full_name, email, role }, { onConflict: "id" });
  return existing.id;
}

// ---------------------------------------------------------------- main

async function main() {
  if (RESET) {
    console.log("Resetting demo data…");
    await supabase.from("meetings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("calls").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("availability_windows").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("availability_change_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("lead_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  console.log("\nTeam:");
  const ids: Record<string, string> = {};
  for (const member of TEAM) {
    ids[member.email] = await ensureUser(
      member.email,
      member.full_name,
      member.role
    );
    console.log(`  ${member.role.padEnd(10)} ${member.email}`);
  }

  // ---- Consultant availability: 08:00–20:00 with a lunch gap ----------
  const { count: existingWindows } = await supabase
    .from("availability_windows")
    .select("*", { count: "exact", head: true });

  if ((existingWindows ?? 0) === 0) {
    const windows: {
      consultant_id: string;
      start_time: string;
      end_time: string;
    }[] = [];

    for (const email of CONSULTANT_EMAILS) {
      const consultantId = ids[email];
      // Skip today (inside the 24h lock) and cover the next 13 days.
      for (let day = 1; day <= 13; day++) {
        const d = new Date();
        d.setDate(d.getDate() + day);
        const weekday = d.getDay();
        if (weekday === 0) continue; // no Sundays

        if (email === CONSULTANT_EMAILS[0]) {
          // Morning block + afternoon/evening block
          windows.push({
            consultant_id: consultantId,
            start_time: atLocalTime(day, 8).toISOString(),
            end_time: atLocalTime(day, 13).toISOString(),
          });
          windows.push({
            consultant_id: consultantId,
            start_time: atLocalTime(day, 14).toISOString(),
            end_time: atLocalTime(day, 20).toISOString(),
          });
        } else {
          // Later starter, works the evening
          windows.push({
            consultant_id: consultantId,
            start_time: atLocalTime(day, 11).toISOString(),
            end_time: atLocalTime(day, 20).toISOString(),
          });
        }
      }
    }

    const { error } = await supabase.from("availability_windows").insert(windows);
    if (error) throw new Error(`windows: ${error.message}`);
    console.log(`\nAvailability: ${windows.length} windows across 2 consultants`);
  } else {
    console.log(`\nAvailability: ${existingWindows} windows already present`);
  }

  // ---- Leads ---------------------------------------------------------
  const { count: existingLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  if ((existingLeads ?? 0) >= 150) {
    console.log(`Leads: ${existingLeads} already present — skipping`);
  } else {
    let leadIndex = 0;
    const allRows: Record<string, unknown>[] = [];

    for (const email of CALLER_EMAILS) {
      const count = 60 + Math.floor(rnd() * 11); // 60–70
      for (let i = 0; i < count; i++) {
        const lead = makeLead(leadIndex++);
        const status = pickStatus();

        allRows.push({
          name: lead.name,
          business_name: lead.business_name,
          phone: lead.phone,
          email: lead.email,
          location: lead.location,
          website: lead.website,
          source: lead.source,
          status,
          assigned_caller_id: ids[email],
          follow_up_at:
            status === "callback"
              ? atLocalTime(
                  Math.floor(rnd() * 5) - 1, // some overdue, some upcoming
                  9 + Math.floor(rnd() * 9),
                  pick([0, 15, 30, 45])
                ).toISOString()
              : null,
          not_interested_reason:
            status === "not_interested" ? pick(NOT_INTERESTED_REASONS) : null,
        });
      }
    }

    // Insert in batches so we don't blow the request size.
    for (let i = 0; i < allRows.length; i += 100) {
      const batch = allRows.slice(i, i + 100);
      const { error } = await supabase.from("leads").insert(batch as never);
      if (error) throw new Error(`leads batch ${i}: ${error.message}`);
    }
    console.log(`Leads: ${allRows.length} created across 3 callers`);
  }

  // ---- Call history on everything that's been touched -----------------
  const { data: touchedLeads } = await supabase
    .from("leads")
    .select("id, status, assigned_caller_id")
    .neq("status", "new");

  const { count: existingCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true });

  if ((existingCalls ?? 0) === 0 && touchedLeads) {
    const calls: {
      lead_id: string;
      caller_id: string;
      outcome: CallOutcome;
      notes: string;
      called_at: string;
    }[] = [];

    for (const lead of touchedLeads) {
      if (!lead.assigned_caller_id) continue;

      const attempts =
        lead.status === "no_answer" ? 1 + Math.floor(rnd() * 3) : 1;

      for (let a = 0; a < attempts; a++) {
        const last = a === attempts - 1;
        const outcome: CallOutcome = !last
          ? "no_answer"
          : lead.status === "callback"
            ? "callback_later"
            : lead.status === "not_interested"
              ? "not_interested"
              : lead.status === "booked"
                ? "interested"
                : "no_answer";

        calls.push({
          lead_id: lead.id,
          caller_id: lead.assigned_caller_id,
          outcome,
          notes: pick(CALL_NOTES[outcome]),
          called_at: atLocalTime(
            -(attempts - a) - Math.floor(rnd() * 3),
            9 + Math.floor(rnd() * 9),
            pick([0, 15, 30, 45])
          ).toISOString(),
        });
      }
    }

    for (let i = 0; i < calls.length; i += 200) {
      const { error } = await supabase
        .from("calls")
        .insert(calls.slice(i, i + 200) as never);
      if (error) throw new Error(`calls batch ${i}: ${error.message}`);
    }
    console.log(`Calls: ${calls.length} logged`);
  } else {
    console.log(`Calls: ${existingCalls} already present`);
  }

  // ---- Meetings for the booked leads ---------------------------------
  const { count: existingMeetings } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true });

  if ((existingMeetings ?? 0) === 0) {
    const { data: bookedLeads } = await supabase
      .from("leads")
      .select("id, assigned_caller_id")
      .eq("status", "booked");

    const meetings: Record<string, unknown>[] = [];
    let n = 0;

    for (const lead of bookedLeads ?? []) {
      if (!lead.assigned_caller_id) continue;
      const consultantId = ids[CONSULTANT_EMAILS[n % CONSULTANT_EMAILS.length]];

      // Roughly half already happened, half still to come.
      const inPast = chance(0.55);
      const dayOffset = inPast
        ? -(1 + Math.floor(rnd() * 6))
        : 1 + Math.floor(rnd() * 6);
      const hour = 9 + Math.floor(rnd() * 9);
      const minute = pick([0, 15, 30, 45]);
      const start = atLocalTime(dayOffset, hour, minute);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const result: MeetingResult = !inPast
        ? "pending"
        : pick(["onboarded", "follow_up", "not_interested", "no_show", "pending"]);

      meetings.push({
        lead_id: lead.id,
        caller_id: lead.assigned_caller_id,
        consultant_id: consultantId,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        context_notes: pick([
          "Wants pricing for a 12-month retainer.",
          "Asked specifically about turnaround time and team size.",
          "Comparing us against two other agencies.",
          "Budget approved, just needs to see scope.",
          "Referred by an existing client.",
        ]),
        result,
        analysis_output:
          result !== "pending" && result !== "no_show"
            ? pick(ANALYSIS_SAMPLES)
            : null,
        completed_at:
          result !== "pending" ? new Date(end.getTime()).toISOString() : null,
        proposal_sent_at:
          result === "onboarded" && chance(0.7)
            ? new Date(end.getTime() + 3600_000).toISOString()
            : null,
        invoice_sent_at:
          result === "onboarded" && chance(0.4)
            ? new Date(end.getTime() + 7200_000).toISOString()
            : null,
      });
      n++;
    }

    for (let i = 0; i < meetings.length; i += 100) {
      const { error } = await supabase
        .from("meetings")
        .insert(meetings.slice(i, i + 100) as never);
      if (error) throw new Error(`meetings batch ${i}: ${error.message}`);
    }
    console.log(`Meetings: ${meetings.length} created`);
  } else {
    console.log(`Meetings: ${existingMeetings} already present`);
  }

  // ---- A couple of pending requests for the admin queue ---------------
  const { count: existingRequests } = await supabase
    .from("lead_requests")
    .select("*", { count: "exact", head: true });

  if ((existingRequests ?? 0) === 0) {
    await supabase.from("lead_requests").insert([
      {
        caller_id: ids["caller@lumelush.com"],
        requested_count: 40,
        note: "Running low — anything in Pune or Mumbai would be ideal.",
      },
    ]);
    console.log("Lead requests: 1 pending");
  }

  // ---- Summary --------------------------------------------------------
  const { data: summary } = await supabase
    .from("profiles")
    .select("full_name, email, role");

  console.log("\n────────────────────────────────────────");
  console.log("Sign in at http://localhost:3000/login");
  console.log(`Password for every account: ${PASSWORD}\n`);
  for (const p of summary ?? []) {
    console.log(`  ${p.role.padEnd(11)} ${p.email.padEnd(26)} ${p.full_name}`);
  }
  console.log("────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
