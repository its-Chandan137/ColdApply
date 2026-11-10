"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { renderFacts, retrieveTopK } from "@/lib/retrieve";
import { generateJSON } from "@/lib/llm";
import { extractEmails, guessName } from "@/lib/emails";
import { logEvent } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

type ScoreResult = {
  score?: number;
  reasons?: string[];
  gaps?: string[];
};

function fail(e: unknown): ActionResult {
  const error = e instanceof Error ? e.message : String(e);
  void logEvent({ level: "error", scope: "jobs", message: error });
  return { ok: false, error };
}

/** Retrieve top-k profile chunks, then ask the LLM for score/reasons/gaps. */
export async function scoreJob(jobId: string): Promise<ActionResult> {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return { ok: false, error: "Job not found." };

    const query = `${job.title} ${job.company} ${job.description.slice(0, 1500)}`;
    const facts = renderFacts(await retrieveTopK(query, 6));

    const result = await generateJSON<ScoreResult>(
      `You are a strict job-fit scorer for a single candidate.

PROFILE FACTS (retrieved by similarity - the only evidence you may use):
${facts}

JOB POSTING:
Company: ${job.company}
Title: ${job.title}
Description: ${job.description.slice(0, 3000)}

Return JSON exactly:
{"score": <0-100 integer>, "reasons": ["<concrete match>", ...], "gaps": ["<honest mismatch>", ...]}

Rules:
- score 0-100, integer.
- reasons: 2-6 items, each citing an actual profile fact that maps to the job. No invented skills.
- gaps: 1-4 items, honest missing requirements (write "none major" only if truly none).
- Be conservative: strong overlap needed for 70+.`,
    );

    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(result.score ?? 0))),
    );
    const reasons = (result.reasons ?? []).filter((r) => typeof r === "string");
    const gaps = (result.gaps ?? []).filter((g) => typeof g === "string");

    await prisma.job.update({
      where: { id: jobId },
      data: { matchScore: score, matchReasons: reasons, matchGaps: gaps },
    });
    return { ok: true, message: `Scored ${score}/100.` };
  } catch (e) {
    return fail(e);
  }
}

/** Create a job, then score it against the profile. */
export async function addJob(prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const title = String(formData.get("title") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const url = String(formData.get("url") || "").trim();

    if (!title || !company || !description) {
      return {
        ok: false,
        error: "Title, company and description are all required.",
      };
    }

    const job = await prisma.job.create({
      data: {
        title,
        company,
        description,
        url: url || null,
      },
    });

    // Feature 3: harvest any email address in the description text.
    let extracted = 0;
    try {
      const emails = extractEmails(description);
      if (emails.length > 0) {
        await prisma.contact.createMany({
          data: emails.map((email) => ({
            jobId: job.id,
            email,
            name: guessName(email) || null,
            source: "job_post",
          })),
        });
        extracted = emails.length;
      }
    } catch (e) {
      await logEvent({
        level: "error",
        scope: "contacts",
        message: `email extraction failed for job ${job.id}`,
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    const scored = await scoreJob(job.id);
    revalidatePath("/jobs");

    const contactNote =
      extracted > 0 ? ` Extracted ${extracted} email(s) from the posting.` : "";
    if (!scored.ok) {
      return {
        ok: true,
        message: "Job saved, but scoring failed.",
        warning: `Scoring failed: ${scored.error} Fix your API keys and use "Re-score" on the job page.${contactNote}`,
      };
    }
    return { ok: true, message: `Job saved. ${scored.message}${contactNote}` };
  } catch (e) {
    return fail(e);
  }
}

export async function rescoreJob(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing job id." };
    const result = await scoreJob(id);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${id}`);
    return result;
  } catch (e) {
    return fail(e);
  }
}

export async function deleteJob(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing job id." };
    await prisma.job.delete({ where: { id } }); // contacts/outreach cascade
    revalidatePath("/jobs");
    return { ok: true, message: "Job deleted." };
  } catch (e) {
    return fail(e);
  }
}
