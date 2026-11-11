"use client";

import { useActionState } from "react";
import { saveAlertSettingsAction } from "@/app/actions/imports";
import type { ActionResult } from "@/lib/types";
import type { AlertImportSettings } from "@/lib/import/types";

const initial: ActionResult = { ok: true };

export default function AlertImportSettingsForm({
  settings,
}: {
  settings: AlertImportSettings;
}) {
  const [state, action, pending] = useActionState(saveAlertSettingsAction, initial);

  return (
    <form
      action={action}
      className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Alert Email Settings</h3>
          <p className="text-xs text-[#8293AD]">
            IMAP import from job-alert emails (Gmail). Uses GMAIL_USER / GMAIL_APP_PASSWORD from .env.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#111827]">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
          Enabled for worker
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Allowed senders (comma/newline, match by email or name)</span>
          <textarea
            name="senders"
            rows={3}
            defaultValue={settings.senders}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Subject keywords (any match)</span>
          <input
            name="subjectKeywords"
            defaultValue={settings.subjectKeywords}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Mailbox</span>
          <input
            name="mailbox"
            defaultValue={settings.mailbox}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Lookback days</span>
          <input
            name="lookbackDays"
            type="number"
            min={1}
            max={30}
            defaultValue={settings.lookbackDays}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Max emails to scan</span>
          <input
            name="maxEmails"
            type="number"
            min={1}
            max={100}
            defaultValue={settings.maxEmails}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Min draft score</span>
          <input
            name="minDraftScore"
            type="number"
            min={0}
            max={100}
            defaultValue={settings.minDraftScore}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-[#111827]">
        <input type="checkbox" name="autoDraft" defaultChecked={settings.autoDraft} />
        Auto-draft initial outreach when score ≥ min and a contact exists (still needs approval to send)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#075B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064a40] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.message && <span className="text-sm text-emerald-600">{state.message}</span>}
      </div>
    </form>
  );
}
