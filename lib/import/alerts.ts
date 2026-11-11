import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ParsedMail } from "mailparser";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { getAlertImportSettings } from "./settings";
import { processImportedJobs } from "./pipeline";
import type { NormalizedJob } from "./types";

function imapClient() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set in .env");
  }
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

function splitList(s: string): string[] {
  return s
    .split(/[\n,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isJobLink(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("linkedin.com/jobs") ||
    u.includes("linkedin.com/comm/jobs") ||
    u.includes("naukri.com/job") ||
    u.includes("indeed.com/viewjob") ||
    u.includes("indeed.com/rc/clk") ||
    u.includes("hirist.com/j/") ||
    u.includes("instahyre.com/job") ||
    u.includes("wellfound.com/jobs") ||
    u.includes("cutshort.io/job") ||
    u.includes("/careers/") ||
    u.includes("/jobs/") ||
    u.includes("greenhouse.io") ||
    u.includes("lever.co")
  );
}

function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // strip common tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "trk", "refId", "trackingId"].forEach(
      (p) => u.searchParams.delete(p),
    );
    return u.toString();
  } catch {
    return raw;
  }
}

function extractLinks(html: string): Array<{ url: string; text: string }> {
  const out: Array<{ url: string; text: string }> = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    const text = stripHtml(m[2]).replace(/\s+/g, " ").trim();
    if (url && url.startsWith("http")) out.push({ url, text });
  }
  return out;
}

function parseJobsFromEmail(parsed: ParsedMail): NormalizedJob[] {
  const html = typeof parsed.html === "string" ? parsed.html : "";
  const text = parsed.text || stripHtml(html);
  const links = extractLinks(html);
  const jobLinks = links.filter((l) => isJobLink(l.url));
  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (const l of jobLinks) {
    const url = cleanUrl(l.url);
    if (seen.has(url)) continue;
    seen.add(url);

    let title = l.text || "";
    let company = "";

    // Heuristics: "Title at Company", "Title - Company", "Title | Company"
    const m1 = title.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    const m2 = title.match(/^(.+?)\s+[|\-–—]\s+(.+)$/i);
    if (m1) { title = m1[1].trim(); company = m1[2].trim(); }
    else if (m2 && m2[2].length < 60) { title = m2[1].trim(); company = m2[2].trim(); }

    // Try to find company in nearby text lines
    if (!company) {
      const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const idx = lines.findIndex((line) => line.includes(title.slice(0, Math.min(30, title.length))));
      if (idx >= 0 && idx + 1 < lines.length) {
        const next = lines[idx + 1];
        if (next.length < 60 && !/apply|view|see|job/i.test(next)) company = next;
      }
    }

    // Fallback: use subject/from hints
    if (!title || title.length < 3) title = parsed.subject || "Job opportunity";
    if (!company) {
      const fromName = parsed.from?.value?.[0]?.name || "";
      company = /linkedin/i.test(fromName) ? "LinkedIn Alert" : /naukri/i.test(fromName) ? "Naukri Alert" : (fromName || "Unknown");
    }

    // Use a slice of email text as description (full JD often not in alert)
    const descBase = text.slice(0, 4000).trim();
    const description = descBase.length > 80
      ? `Imported from job alert email.\nSubject: ${parsed.subject || ""}\nLink: ${url}\n\n${descBase}`
      : `Imported from job alert email.\nSubject: ${parsed.subject || ""}\nLink: ${url}\n\nPlease open the link to view the full job description and update this field.`;

    jobs.push({
      title: title.slice(0, 200),
      company: company.slice(0, 120),
      url,
      description,
      externalId: url,
    });
  }

  // Fallback: if no job links found but email itself looks like a single job alert
  if (jobs.length === 0 && text.length > 100) {
    const subj = parsed.subject || "Job alert";
    if (/job|hiring|opening|role|position|developer|engineer/i.test(subj + " " + text.slice(0, 300))) {
      jobs.push({
        title: subj.slice(0, 200),
        company: parsed.from?.value?.[0]?.name || "Job Alert",
        url: null,
        description: `Imported from job alert email (no direct job link parsed).\nSubject: ${subj}\n\n${text.slice(0, 4000)}`,
        externalId: null,
      });
    }
  }

  return jobs;
}

function matchesFilters(parsed: ParsedMail, senders: string[], keywords: string[]): boolean {
  const from = (parsed.from?.value?.[0]?.address || "").toLowerCase();
  const fromName = (parsed.from?.value?.[0]?.name || "").toLowerCase();
  const subject = (parsed.subject || "").toLowerCase();
  const senderOk = senders.length === 0 || senders.some((s) => from.includes(s) || fromName.includes(s));
  const kwOk = keywords.length === 0 || keywords.some((k) => subject.includes(k));
  return senderOk && kwOk;
}

export async function runAlertEmailImport(trigger: "manual" | "worker" = "manual") {
  const settings = await getAlertImportSettings();
  const run = await prisma.importRun.create({
    data: {
      kind: "alert_email",
      status: "running",
      trigger,
      details: { mailbox: settings.mailbox, lookbackDays: settings.lookbackDays },
    },
  });

  const client = imapClient();
  let lock: Awaited<ReturnType<typeof client.getMailboxLock>> | null = null;

  try {
    await client.connect();
    const mailbox = settings.mailbox || "INBOX";
    lock = await client.getMailboxLock(mailbox);

    const since = new Date(Date.now() - settings.lookbackDays * 24 * 60 * 60 * 1000);
    const senders = splitList(settings.senders);
    const keywords = splitList(settings.subjectKeywords);

    // Fetch recent messages (by date) and filter in code for flexibility.
    const uids: number[] = [];
    for await (const msg of client.fetch({ since }, { uid: true, envelope: true })) {
      if (msg.uid) uids.push(msg.uid);
    }
    // newest first, cap
    uids.sort((a, b) => b - a);
    const selected = uids.slice(0, settings.maxEmails);

    const allJobs: NormalizedJob[] = [];
    let fetched = 0;
    let parsedCount = 0;

    for (const uid of selected) {
      try {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!msg) continue;
        const source = (msg as { source?: Buffer }).source;
        if (!source) continue;
        fetched++;
        const parsed = await simpleParser(source);
        if (!matchesFilters(parsed, senders, keywords)) continue;
        const jobs = parseJobsFromEmail(parsed);
        if (jobs.length > 0) {
          parsedCount++;
          allJobs.push(...jobs);
        }
      } catch (e) {
        await logEvent({
          level: "error",
          scope: "import",
          message: `alert email parse failed (uid ${uid}): ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    const pipeline = await processImportedJobs({
      jobs: allJobs,
      source: "alert_email",
      importRunId: run.id,
      autoDraft: settings.autoDraft,
      minDraftScore: settings.minDraftScore,
    });

    const finished = await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: pipeline.errors > 0 && pipeline.imported === 0 ? "failed" : pipeline.errors > 0 ? "partial" : "success",
        finishedAt: new Date(),
        fetched,
        parsed: parsedCount,
        imported: pipeline.imported,
        duplicates: pipeline.duplicates,
        scored: pipeline.scored,
        contactsFound: pipeline.contactsFound,
        drafted: pipeline.drafted,
        errors: pipeline.errors,
        message: `Scanned ${fetched} emails, parsed ${parsedCount}, imported ${pipeline.imported}, duplicates ${pipeline.duplicates}`,
        details: {
          jobIds: pipeline.jobIds.slice(0, 50),
          errorMessages: pipeline.errorMessages.slice(0, 20),
        },
      },
    });

    await logEvent({ scope: "import", message: `Alert import finished: ${finished.message}` });
    return finished;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), errors: 1, message: msg },
    });
    await logEvent({ level: "error", scope: "import", message: `Alert import failed: ${msg}` });
    return prisma.importRun.findUnique({ where: { id: run.id } });
  } finally {
    if (lock) lock.release();
    try { await client.logout(); } catch { /* ignore */ }
  }
}
