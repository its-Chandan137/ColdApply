"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateDraft } from "@/lib/draft";
import { logEvent } from "@/lib/log";
import { OUTREACH_STATUSES } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown): ActionResult {
  const error = e instanceof Error ? e.message : String(e);
  void logEvent({ level: "error", scope: "ui", message: error });
  return { ok: false, error };
}

/** Manual status change from the dashboard table. */
export async function updateStatus(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "");
    if (!id) return { ok: false, error: "Missing outreach id." };
    if (!(OUTREACH_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: `Unknown status "${status}".` };
    }

    const o = await prisma.outreach.findUnique({ where: { id } });
    if (!o) return { ok: false, error: "Outreach not found." };

    await prisma.outreach.update({
      where: { id },
      data: {
        status,
        ...(status === "replied" && !o.repliedAt ? { repliedAt: new Date() } : {}),
        ...(status === "sent" && !o.sentAt ? { sentAt: new Date() } : {}),
      },
    });
    revalidatePath("/");
    revalidatePath("/outreach");
    return { ok: true, message: `Status → ${status.replace(/_/g, " ")}.` };
  } catch (e) {
    return fail(e);
  }
}

/** Free-text notes per row. */
export async function updateNotes(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const notes = String(formData.get("notes") || "").slice(0, 4000);
    if (!id) return { ok: false, error: "Missing outreach id." };
    await prisma.outreach.update({ where: { id }, data: { notes } });
    revalidatePath("/");
    return { ok: true, message: "Notes saved." };
  } catch (e) {
    return fail(e);
  }
}

/** Manually trigger the follow-up draft the worker would otherwise create. */
export async function draftFollowUpNow(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const parent = await prisma.outreach.findUnique({
      where: { id },
      include: { job: true, contact: true, followups: { select: { id: true } } },
    });
    if (!parent) return { ok: false, error: "Outreach not found." };
    if (parent.kind !== "initial") {
      return { ok: false, error: "Follow-ups are only drafted from initial outreach." };
    }
    if (parent.followups.length > 0) {
      return { ok: false, error: "A follow-up already exists for this email." };
    }
    if (parent.status === "replied") {
      return { ok: false, error: "They already replied - no follow-up needed." };
    }

    const draft = await generateDraft({
      job: parent.job,
      contact: parent.contact,
      mode: "followup",
      previous: { subject: parent.subject, body: parent.body },
    });

    await prisma.outreach.create({
      data: {
        jobId: parent.jobId,
        contactId: parent.contactId,
        kind: "followup",
        parentOutreachId: parent.id,
        subject: draft.subject,
        body: draft.body,
        status: "drafted",
        notes: "Follow-up draft - needs approval.",
      },
    });
    if (parent.status === "sent") {
      await prisma.outreach.update({
        where: { id: parent.id },
        data: { status: "no_reply" },
      });
    }
    revalidatePath("/");
    revalidatePath("/outreach");
    return { ok: true, message: "Follow-up drafted - review it in Outreach." };
  } catch (e) {
    return fail(e);
  }
}
