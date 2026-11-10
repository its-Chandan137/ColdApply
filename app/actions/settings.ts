"use server";

import { revalidatePath } from "next/cache";
import { autoSendEnabled, setSetting } from "@/lib/settings";
import { logEvent } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

/** Auto-send is OFF by default and must be explicitly enabled. */
export async function toggleAutoSend(): Promise<ActionResult> {
  try {
    const current = await autoSendEnabled();
    const next = !current;
    await setSetting("autoSend", String(next));
    await logEvent({
      scope: "ui",
      message: `auto-send ${next ? "ENABLED" : "disabled"} by user`,
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: next
        ? "Auto-send ENABLED. The worker will now send approved emails within the daily cap."
        : "Auto-send disabled. Approved emails wait until you press Send now.",
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    void logEvent({ level: "error", scope: "ui", message: error });
    return { ok: false, error };
  }
}
