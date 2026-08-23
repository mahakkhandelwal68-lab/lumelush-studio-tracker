import "server-only";

// Creates a Google Meet link for a booking, under the studio's connected
// Gmail account. Two strategies, tried in order:
//
//  1. Google Meet REST API — create a "Space" with accessType OPEN, so
//     literally anyone with the link joins instantly, no waiting room, even
//     if forwarded to a different email. Requires the
//     meetings.space.created scope.
//  2. Fallback: a Calendar event with auto-generated conferenceData and the
//     lead + consultant added as named guests. Named guests skip the
//     waiting room too — just not people the link gets forwarded to.
//
// Either way this fails soft: if Google isn't configured, or any call
// errors for any reason, callers get `null` back and the booking still
// completes. A missing Meet link is never worth blocking a booking over.

interface CreateMeetEventInput {
  startIso: string;
  endIso: string;
  summary: string;
  description?: string;
  attendeeEmails: string[];
}

interface CreateMeetEventResult {
  meetLink: string;
  eventId: string | null;
  /** Which strategy actually produced the link — useful for debugging. */
  accessType: "open" | "invite_only";
}

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error("Google token refresh failed:", await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.error("Google token refresh error:", err);
    return null;
  }
}

/** Tries to create a fully open Meet space. Returns its join link, or null. */
async function tryCreateOpenSpace(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ config: { accessType: "OPEN" } }),
    });

    if (!res.ok) {
      // Expected on accounts/plans that don't support open spaces — not an error.
      console.warn("Open Meet space unavailable, falling back:", await res.text());
      return null;
    }

    const space = await res.json();
    return space.meetingUri ?? null;
  } catch (err) {
    console.warn("Open Meet space request failed, falling back:", err);
    return null;
  }
}

/** Creates a Calendar event, either linking an existing Meet URI or letting
 * Calendar auto-generate one via conferenceData (invite-only fallback). */
async function createCalendarEvent(
  accessToken: string,
  input: CreateMeetEventInput,
  openMeetLink: string | null
) {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: openMeetLink
      ? `${input.description ?? ""}\n\nJoin: ${openMeetLink}`.trim()
      : input.description,
    start: { dateTime: input.startIso },
    end: { dateTime: input.endIso },
    // Named guests skip Meet's "ask to join" waiting room even on the
    // invite-only fallback path.
    attendees: input.attendeeEmails.filter(Boolean).map((email) => ({ email })),
  };

  if (openMeetLink) {
    body.location = openMeetLink;
  } else {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error("Google Calendar event creation failed:", await res.text());
    return null;
  }

  return res.json();
}

export async function createMeetEvent(
  input: CreateMeetEventInput
): Promise<CreateMeetEventResult | null> {
  if (!isConfigured()) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const openMeetLink = await tryCreateOpenSpace(accessToken);

  const event = await createCalendarEvent(accessToken, input, openMeetLink);
  if (!event) return null;

  if (openMeetLink) {
    return { meetLink: openMeetLink, eventId: event.id ?? null, accessType: "open" };
  }

  const generatedLink: string | undefined =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(
      (e: { entryPointType?: string }) => e.entryPointType === "video"
    )?.uri;

  if (!generatedLink) return null;

  return { meetLink: generatedLink, eventId: event.id ?? null, accessType: "invite_only" };
}
