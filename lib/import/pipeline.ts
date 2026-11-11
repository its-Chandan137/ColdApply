import { prisma } from "@/lib/db";
import { scoreJob } from "@/app/actions/jobs";
import { extractEmails, guessName } from "@/lib/emails";
import { generateDraft } from "@/lib/draft";
import { logEvent } from "@/lib/log";
import type { NormalizedJob, PipelineResult } from "./types";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

async function isDuplicate(job: NormalizedJob, source: string): Promise<boolean> {
  const url = job.url?.trim();
  if (url) {
    const byUrl = await prisma.job.findFirst({ where: { url } });
    if (byUrl) return true;
  }
  if (job.externalId) {
    const byExt = await prisma.job.findFirst({
      where: { source, externalId: job.externalId },
    });
    if (byExt) return true;
  }
  const title = norm(job.title);
  const company = norm(job.company);
  if (title && company) {
    const existing = await prisma.job.findMany({
      select: { title: true, company: true },
    });
    if (existing.some((e) => norm(e.title) === title && norm(e.company) === company)) {
      return true;
    }
  }
  return false;
}

export async function processImportedJobs(opts: {
  jobs: NormalizedJob[];
  source: string; // alert_email | api_remotive | api_adzuna
  importRunId: string;
  autoDraft: boolean;
  minDraftScore: number;
}): Promise<PipelineResult> {
  const result: PipelineResult = {
    imported: 0,
    duplicates: 0,
    scored: 0,
    contactsFound: 0,
    drafted: 0,
    errors: 0,
    jobIds: [],
    errorMessages: [],
  };

  for (const j of opts.jobs) {
    const title = (j.title || "").trim();
    const company = (j.company || "").trim();
    const description = (j.description || "").trim();
    if (!title || !company || !description) {
      result.duplicates++; // skip invalid silently-ish? count as skipped
      continue;
    }

    try {
      if (await isDuplicate(j, opts.source)) {
        result.duplicates++;
        continue;
      }

      const job = await prisma.job.create({
        data: {
          title,
          company,
          description,
          url: j.url?.trim() || null,
          source: opts.source,
          externalId: j.externalId?.trim() || null,
          importRunId: opts.importRunId,
        },
      });
      result.imported++;
      result.jobIds.push(job.id);

      // Extract contacts from description
      try {
        const emails = extractEmails(description);
        if (emails.length > 0) {
          const existingEmails = new Set<string>();
          for (const email of emails) {
            if (existingEmails.has(email)) continue;
            existingEmails.add(email);
            await prisma.contact.create({
              data: {
                jobId: job.id,
                email,
                name: guessName(email) || null,
                source: "job_post",
              },
            });
            result.contactsFound++;
          }
        }
      } catch (e) {
        await logEvent({
          level: "error",
          scope: "jobs",
          message: `contact extraction failed for imported job ${job.id}`,
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      // Score
      try {
        const scored = await scoreJob(job.id);
        if (scored.ok) result.scored++;
      } catch (e) {
        result.errors++;
        result.errorMessages.push(`score ${job.id}: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Auto-draft for first eligible contact if enabled
      if (opts.autoDraft) {
        try {
          const fresh = await prisma.job.findUnique({ where: { id: job.id } });
          if (fresh && (fresh.matchScore ?? 0) >= opts.minDraftScore) {
            const contact = await prisma.contact.findFirst({
              where: { jobId: job.id },
              orderBy: { createdAt: "asc" },
            });
            if (contact) {
              const existingOutreach = await prisma.outreach.findFirst({
                where: { jobId: job.id, contactId: contact.id, kind: "initial" },
              });
              if (!existingOutreach) {
                const draft = await generateDraft({ job: fresh, contact, mode: "initial" });
                await prisma.outreach.create({
                  data: {
                    jobId: job.id,
                    contactId: contact.id,
                    kind: "initial",
                    subject: draft.subject,
                    body: draft.body,
                    status: "drafted",
                  },
                });
                result.drafted++;
              }
            }
          }
        } catch (e) {
          result.errors++;
          result.errorMessages.push(`draft ${job.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      result.errors++;
      result.errorMessages.push(e instanceof Error ? e.message : String(e));
    }
  }

  return result;
}
