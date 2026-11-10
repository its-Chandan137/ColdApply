"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateDraft } from "@/lib/draft";
import { logEvent } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown): ActionResult {
  const error = e instanceof Error ? e.message : String(e);
  void logEvent({ level: "error", scope: "draft", message: error });
  return { ok: false, error };
}

/** LLM writes a 100-120 word email for jobs scoring >= 70 that have a contact. */
export async function draftOutreach(formData: FormData): Promise<ActionResult> {
  try {
    const jobId = String(formData.get("jobId") || "");
    const contactId = String(formData.get("contactId") || "");

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return { ok: false, error: "Job not found." };
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, jobId },
    });
    if (!contact) return { ok: false, error: "Contact not found for this job." };

    if (job.matchScore === null) {
      return { ok: false, error: "Score this job before drafting." };
    }
    if (job.matchScore < 70) {
      return {
        ok: false,
        error: `Job scores ${job.matchScore}/100 - drafts are only generated for scores of 70 or higher.`,
      };
    }

    const existing = await prisma.outreach.findFirst({
      where: {
        jobId,
        contactId,
        kind: "initial",
        status: { in: ["drafted", "approved", "sent", "replied", "no_reply"] },
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return {
        ok: false,
        error: `A ${existing.status} outreach already exists for ${contact.email}.`,
      };
    }

    const draft = await generateDraft({ job, contact, mode: "initial" });

    await prisma.outreach.create({
      data: {
        jobId,
        contactId,
        kind: "initial",
        subject: draft.subject,
        body: draft.body,
        status: "drafted",
      },
    });

    revalidatePath("/outreach");
    revalidatePath(`/jobs/${jobId}`);
    return {
      ok: true,
      message: `Draft written for ${contact.email} - review it in Outreach.`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function approveOutreach(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const o = await prisma.outreach.findUnique({ where: { id } });
    if (!o) return { ok: false, error: "Outreach not found." };
    if (o.status !== "drafted") {
      return { ok: false, error: `Only drafted outreach can be approved (status: ${o.status}).` };
    }
    await prisma.outreach.update({ where: { id }, data: { status: "approved" } });
    revalidatePath("/outreach");
    revalidatePath(`/jobs/${o.jobId}`);
    return { ok: true, message: "Approved - ready to send." };
  } catch (e) {
    return fail(e);
  }
}

export async function unapproveOutreach(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const o = await prisma.outreach.findUnique({ where: { id } });
    if (!o) return { ok: false, error: "Outreach not found." };
    if (o.status !== "approved") {
      return { ok: false, error: `Only approved outreach can be moved back (status: ${o.status}).` };
    }
    await prisma.outreach.update({ where: { id }, data: { status: "drafted" } });
    revalidatePath("/outreach");
    revalidatePath(`/jobs/${o.jobId}`);
    return { ok: true, message: "Moved back to drafts." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateOutreach(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const subject = String(formData.get("subject") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!subject || !body) return { ok: false, error: "Subject and body are required." };

    const o = await prisma.outreach.findUnique({ where: { id } });
    if (!o) return { ok: false, error: "Outreach not found." };
    if (!["drafted", "approved"].includes(o.status)) {
      return { ok: false, error: `Sent outreach cannot be edited (status: ${o.status}).` };
    }

    await prisma.outreach.update({ where: { id }, data: { subject, body } });
    revalidatePath("/outreach");
    revalidatePath(`/jobs/${o.jobId}`);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteOutreach(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const o = await prisma.outreach.findUnique({ where: { id } });
    if (!o) return { ok: false, error: "Outreach not found." };
    if (!["drafted", "approved"].includes(o.status)) {
      return { ok: false, error: `Only unsent outreach can be deleted (status: ${o.status}).` };
    }
    await prisma.outreach.delete({ where: { id } });
    revalidatePath("/outreach");
    revalidatePath(`/jobs/${o.jobId}`);
    return { ok: true, message: "Deleted." };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Manual single send (feature 5). Bypasses the 2-6 min pacing gate because a
 * human clicked it, but NEVER the daily cap or the 10-day rule.
 */
export async function sendNow(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing outreach id." };
    const { sendOutreach } = await import("@/lib/send");
    const result = await sendOutreach(id, { bypassGate: true });
    revalidatePath("/outreach");
    revalidatePath("/dashboard");
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, message: `Sent. Message-ID: ${result.messageId}` };
  } catch (e) {
    return fail(e);
  }
}
