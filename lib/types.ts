export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  warning?: string;
};

/** Outreach statuses (SQLite stores strings; this is the single source of truth). */
export const OUTREACH_STATUSES = [
  "drafted",
  "approved",
  "sent",
  "replied",
  "bounced",
  "no_reply",
  "call_scheduled",
  "interview",
  "rejected",
  "offer",
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const SECTION_TYPES = [
  "summary",
  "skill",
  "experience",
  "project",
  "achievement",
  "other",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const CONTACT_SOURCES = [
  "careers_page",
  "job_post",
  "pattern_guess",
  "manual",
] as const;

export function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}
