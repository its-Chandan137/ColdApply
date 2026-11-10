import { generateJSON } from "./llm";
import { renderFacts, retrieveTopK } from "./retrieve";
import type { Job, Contact } from "@prisma/client";

export type Draft = { subject: string; body: string };

const OPT_OUT =
  "If this isn't relevant, reply \"no thanks\" and I won't follow up again.";

function clip(s: string, n: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

/**
 * Write a cold email (or a follow-up) using ONLY retrieved profile facts,
 * the job text, and the company name. No invented claims.
 */
export async function generateDraft(opts: {
  job: Job;
  contact: Contact;
  mode?: "initial" | "followup";
  previous?: { subject: string; body: string } | null;
}): Promise<Draft> {
  const { job, contact, mode = "initial", previous } = opts;

  const query = `${job.title} ${job.company} ${clip(job.description, 1500)}`;
  const facts = renderFacts(await retrieveTopK(query, 6));

  const recipient = contact.name || contact.email.split("@")[0] || "there";

  const prompt =
    mode === "followup"
      ? `You are following up on a cold email you already sent. Write a short follow-up.

PROFILE FACTS (the only facts you may use - never invent anything):
${facts}

JOB POSTING:
Company: ${job.company}
Title: ${job.title}
Description: ${clip(job.description, 2000)}

EMAIL ALREADY SENT:
Subject: ${previous?.subject ?? "(unknown)"}
Body: ${clip(previous?.body ?? "(unknown)", 1200)}

Rules:
- 60-90 words in the body.
- Add one concrete new angle from the profile facts or job posting; no new claims.
- Friendly, specific, no flattery, no buzzwords, no em dashes.
- End with a single-line opt-out: "${OPT_OUT}"
- Address the recipient as "${recipient}".
Return JSON: {"subject": "...", "body": "..."}. Subject <= 60 chars, no quotes.`
      : `You are writing a cold outreach email to a recruiter/hiring manager.

PROFILE FACTS (the only facts you may use - never invent anything):
${facts}

JOB POSTING:
Company: ${job.company}
Title: ${job.title}
Description: ${clip(job.description, 2000)}

Recipient name: ${recipient} (email: ${contact.email})

Rules:
- Body must be 100-120 words (count them).
- Use ONLY facts from PROFILE FACTS that genuinely relate to this job.
- Reference the specific role/company; be concrete, not generic.
- No invented claims, no fake familiarity, no buzzwords, no em dashes.
- Plain text, no markdown, no placeholders like [Name].
- End with a single-line opt-out: "${OPT_OUT}"
Return JSON: {"subject": "...", "body": "..."}. Subject <= 60 chars, no quotes.`;

  const draft = await generateJSON<Draft>(prompt);
  const subject = clip(draft.subject || `Regarding ${job.title}`, 80);
  let body = (draft.body || "").trim();

  // One retry if the length is off for the initial email.
  if (mode === "initial") {
    const words = body.split(/\s+/).filter(Boolean).length;
    if (words < 95 || words > 125) {
      const retry = await generateJSON<Draft>(
        `${prompt}

Your previous body was ${words} words. Rewrite it to be exactly 100-120 words. Return JSON only.`,
      );
      const retryWords = (retry.body || "").split(/\s+/).filter(Boolean).length;
      if (retryWords >= 95 && retryWords <= 125) {
        body = (retry.body || "").trim();
      }
    }
  }

  if (!body) throw new Error("LLM returned an empty email body");

  // Enforce the opt-out line even if the model dropped it.
  if (!/no thanks|unsubscribe|not interested|opt.?out/i.test(body)) {
    body = `${body}\n\n${OPT_OUT}`;
  }

  return { subject, body };
}
