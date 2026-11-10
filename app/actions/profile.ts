"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf";
import {
  createSectionsEmbedded,
  extractResumeSections,
  reembedSection,
} from "@/lib/profile";
import { logEvent } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown, scope: "profile" | "ui"): ActionResult {
  const error = e instanceof Error ? e.message : String(e);
  void logEvent({ level: "error", scope, message: error });
  return { ok: false, error };
}

/** 1. Upload resume PDF -> extract text -> LLM sections -> embed. */
export async function uploadResume(prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get("resume");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a PDF file first." };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: "PDF is larger than 8 MB." };
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      return { ok: false, error: "Only PDF files are supported." };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buf);
    if (text.trim().length < 100) {
      return {
        ok: false,
        error:
          "Could not extract readable text from this PDF (it may be a scan).",
      };
    }

    const sections = await extractResumeSections(text);

    // Replace the previous resume-derived profile (manual edits included).
    await prisma.profileSection.deleteMany({});
    const { embedded } = await createSectionsEmbedded(sections);

    revalidatePath("/profile");
    const warning =
      embedded < sections.length
        ? `${sections.length - embedded} section(s) saved but could not be embedded - see Dashboard > Errors.`
        : undefined;
    return {
      ok: true,
      message: `Imported ${sections.length} section(s) from ${file.name}, embedded ${embedded}.`,
      warning,
    };
  } catch (e) {
    return fail(e, "profile");
  }
}

export async function addSection(formData: FormData): Promise<ActionResult> {
  try {
    const type = String(formData.get("type") || "other");
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "").trim();
    if (!title || !content) {
      return { ok: false, error: "Title and content are required." };
    }
    const section = await prisma.profileSection.create({
      data: { type, title, content },
    });
    try {
      await reembedSection(section.id);
    } catch (e) {
      await logEvent({
        level: "error",
        scope: "profile",
        message: `embedding failed for new section "${title}"`,
        detail: e instanceof Error ? e.message : String(e),
      });
      revalidatePath("/profile");
      return {
        ok: true,
        message: "Section saved, but embedding failed - see Dashboard > Errors.",
      };
    }
    revalidatePath("/profile");
    return { ok: true, message: "Section added." };
  } catch (e) {
    return fail(e, "profile");
  }
}

export async function updateSection(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    const type = String(formData.get("type") || "other");
    const title = String(formData.get("title") || "").trim();
    const content = String(formData.get("content") || "").trim();
    if (!id || !title || !content) {
      return { ok: false, error: "Title and content are required." };
    }
    await prisma.profileSection.update({
      where: { id },
      data: { type, title, content },
    });
    // Re-embed on section edit (spec: "re-embed on section edit").
    try {
      await reembedSection(id);
    } catch (e) {
      await logEvent({
        level: "error",
        scope: "profile",
        message: "re-embed failed after section edit",
        detail: e instanceof Error ? e.message : String(e),
      });
      revalidatePath("/profile");
      return {
        ok: true,
        message: "Section saved, but re-embedding failed - see Dashboard > Errors.",
      };
    }
    revalidatePath("/profile");
    return { ok: true, message: "Section saved and re-embedded." };
  } catch (e) {
    return fail(e, "profile");
  }
}

export async function deleteSection(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) return { ok: false, error: "Missing section id." };
    await prisma.profileSection.delete({ where: { id } }); // chunks cascade
    revalidatePath("/profile");
    return { ok: true, message: "Section deleted." };
  } catch (e) {
    return fail(e, "profile");
  }
}
