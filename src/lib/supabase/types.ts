// Convenience aliases over the generated schema types.
// Regenerate database.types.ts after any migration.
import type { Database } from "@/lib/supabase/database.types";

export type { Database };

type Enums = Database["public"]["Enums"];
type Tables = Database["public"]["Tables"];

export type UserRole = Enums["user_role"];
/** Maps 1:1 onto the caller's sheet tabs. */
export type LeadStatus = Enums["lead_status"];
export type CallOutcome = Enums["call_outcome"];
export type MeetingResult = Enums["meeting_result"];
export type LeadRequestStatus = Enums["lead_request_status"];
export type ChangeRequestStatus = Enums["change_request_status"];

export type Profile = Tables["profiles"]["Row"];
export type Lead = Tables["leads"]["Row"];
export type Call = Tables["calls"]["Row"];
export type AvailabilityWindow = Tables["availability_windows"]["Row"];
export type Meeting = Tables["meetings"]["Row"];
export type LeadRequest = Tables["lead_requests"]["Row"];
export type AvailabilityChangeRequest =
  Tables["availability_change_requests"]["Row"];
export type ToolResource = Tables["tool_resources"]["Row"];

/** Shape stored in tool_resources.links (a jsonb array). */
export interface ToolLink {
  label: string;
  url: string;
}

export function parseToolLinks(links: unknown): ToolLink[] {
  if (!Array.isArray(links)) return [];
  return links.filter(
    (l): l is ToolLink =>
      typeof l === "object" &&
      l !== null &&
      typeof (l as ToolLink).label === "string" &&
      typeof (l as ToolLink).url === "string"
  );
}
