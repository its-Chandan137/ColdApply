const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Extract every email address found in a block of text (deduped, lowercased). */
export function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of found) {
    const email = raw.toLowerCase().replace(/[.,;:]+$/, "");
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Guess a display name from an email local part: "jane.doe" -> "Jane Doe". */
export function guessName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._-]+/)
    .filter((w) => /^[a-z]+$/i.test(w) && w.length > 1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ");
}

/** Gmail Message-IDs arrive wrapped in angle brackets; normalize both sides. */
export function normalizeMessageId(id: string | null | undefined): string {
  if (!id) return "";
  return id.trim().replace(/^<+/, "").replace(/>+$/, "").toLowerCase();
}
