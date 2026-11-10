"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { extractEmails, guessName } from "@/lib/emails";
import { logEvent } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown): ActionResult {
  const error = e instanceof Error ? e.message : String(e);
  void logEvent({ level: "error", scope: "contacts", message: error });
  return { ok: false, error };
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Pull every email address out of a job's description text. */
export async function extractContacts(formData: FormData): Promise<ActionResult> {
  try {
    const jobId = String(formData.get("jobId") || "");
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return { ok: false, error: "Job not found." };

    const emails = extractEmails(job.description);
    if (emails.length === 0) {
      return {
        ok: true,
        message: `No email addresses found in the description of "${job.title}".`,
      };
    }

    const existing = await prisma.contact.findMany({
      where: { jobId },
      select: { email: true },
    });
    const have = new Set(existing.map((c) => c.email.toLowerCase()));

    let added = 0;
    for (const email of emails) {
      if (have.has(email)) continue;
      await prisma.contact.create({
        data: {
          jobId,
          email,
          name: guessName(email) || null,
          source: "job_post",
        },
      });
      added++;
    }

    revalidatePath("/contacts");
    revalidatePath(`/jobs/${jobId}`);
    return {
      ok: true,
      message:
        added > 0
          ? `Found ${emails.length} address(es), added ${added} new contact(s).`
          : `Found ${emails.length} address(es), all already saved.`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function addContact(prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const jobId = String(formData.get("jobId") || "");
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const name = String(formData.get("name") || "").trim();

    if (!jobId) return { ok: false, error: "Pick a job for this contact." };
    if (!EMAIL_OK.test(email)) {
      return { ok: false, error: `"${email}" is not a valid email address.` };
    }

    const dupe = await prisma.contact.findFirst({
      where: { jobId, email },
      select: { id: true },
    });
    if (dupe) return { ok: false, error: `${email} is already a contact for this job.` };

    await prisma.contact.create({
      data: {
        jobId,
        email,
        name: name || guessName(email) || null,
        source: "manual",
      },
    });
    revalidatePath("/contacts");
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, message: `Added ${email}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContact(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing contact id." };
    await prisma.contact.delete({ where: { id } }); // outreach cascades
    revalidatePath("/contacts");
    return { ok: true, message: "Contact deleted." };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleVerified(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return { ok: false, error: "Contact not found." };
    await prisma.contact.update({
      where: { id },
      data: { verified: !contact.verified },
    });
    revalidatePath("/contacts");
    revalidatePath(`/jobs/${contact.jobId}`);
    return { ok: true, message: contact.verified ? "Marked unverified." : "Marked verified." };
  } catch (e) {
    return fail(e);
  }
}
