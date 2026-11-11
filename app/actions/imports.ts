"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";
import { runAlertEmailImport } from "@/lib/import/alerts";
import { runJobApiImport } from "@/lib/import/api";
import { saveAlertImportSettings, saveApiImportSettings } from "@/lib/import/settings";

function ok(message: string): ActionResult {
  return { ok: true, message };
}
function fail(error: string): ActionResult {
  return { ok: false, error };
}

export async function saveAlertSettingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await saveAlertImportSettings({
      enabled: formData.get("enabled") === "on",
      senders: String(formData.get("senders") || ""),
      subjectKeywords: String(formData.get("subjectKeywords") || ""),
      mailbox: String(formData.get("mailbox") || "INBOX"),
      lookbackDays: Number(formData.get("lookbackDays") || 7),
      maxEmails: Number(formData.get("maxEmails") || 25),
      autoDraft: formData.get("autoDraft") === "on",
      minDraftScore: Number(formData.get("minDraftScore") || 70),
    });
    revalidatePath("/imports/alerts");
    return ok("Alert import settings saved.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runAlertImportAction(
  _prev?: ActionResult | FormData,
  _fd?: FormData,
): Promise<ActionResult> {
  try {
    const run = await runAlertEmailImport("manual");
    revalidatePath("/imports/alerts");
    revalidatePath("/jobs");
    revalidatePath("/outreach");
    if (!run) return fail("Import run failed to start.");
    if (run.status === "failed") return fail(run.message || "Alert import failed.");
    return ok(run.message || "Alert import completed.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function saveApiSettingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const provider = String(formData.get("provider") || "remotive") === "adzuna" ? "adzuna" : "remotive";
    await saveApiImportSettings({
      enabled: formData.get("enabled") === "on",
      provider,
      query: String(formData.get("query") || ""),
      location: String(formData.get("location") || ""),
      adzunaAppId: String(formData.get("adzunaAppId") || ""),
      adzunaAppKey: String(formData.get("adzunaAppKey") || ""),
      adzunaCountry: String(formData.get("adzunaCountry") || "in"),
      maxResults: Number(formData.get("maxResults") || 20),
      autoDraft: formData.get("autoDraft") === "on",
      minDraftScore: Number(formData.get("minDraftScore") || 70),
    });
    revalidatePath("/imports/api");
    return ok("API import settings saved.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runApiImportAction(
  _prev?: ActionResult | FormData,
  _fd?: FormData,
): Promise<ActionResult> {
  try {
    const run = await runJobApiImport("manual");
    revalidatePath("/imports/api");
    revalidatePath("/jobs");
    revalidatePath("/outreach");
    if (!run) return fail("Import run failed to start.");
    if (run.status === "failed") return fail(run.message || "API import failed.");
    return ok(run.message || "API import completed.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
