"use client";

import { useActionState } from "react";
import { saveApiSettingsAction } from "@/app/actions/imports";
import type { ActionResult } from "@/lib/types";
import type { ApiImportSettings } from "@/lib/import/types";

const initial: ActionResult = { ok: true };

export default function ApiImportSettingsForm({
  settings,
}: {
  settings: ApiImportSettings;
}) {
  const [state, action, pending] = useActionState(saveApiSettingsAction, initial);

  return (
    <form
      action={action}
      className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Job API Settings</h3>
          <p className="text-xs text-[#8293AD]">
            Import jobs from free APIs (Remotive is keyless; Adzuna requires app id/key).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#111827]">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
          Enabled for worker
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Provider</span>
          <select
            name="provider"
            defaultValue={settings.provider}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          >
            <option value="remotive">Remotive (free, no key)</option>
            <option value="adzuna">Adzuna (free tier, needs keys)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Max results</span>
          <input
            name="maxResults"
            type="number"
            min={1}
            max={50}
            defaultValue={settings.maxResults}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Search query</span>
          <input
            name="query"
            defaultValue={settings.query}
            placeholder="e.g. frontend react typescript"
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Location (Adzuna & optional)</span>
          <input
            name="location"
            defaultValue={settings.location}
            placeholder="e.g. Bangalore, Remote"
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Adzuna country code</span>
          <input
            name="adzunaCountry"
            defaultValue={settings.adzunaCountry}
            placeholder="in, gb, us..."
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Adzuna App ID</span>
          <input
            name="adzunaAppId"
            defaultValue={settings.adzunaAppId}
            className="mt-1 w-full rounded-lg border border-[#E5EAF0] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Adzuna App Key</span>
          <input
            name="adzunaAppKey"
            defaultValue={settings.adzunaAppKey}
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
