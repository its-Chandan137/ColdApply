"use client";

import { useActionState } from "react";
import { addContact } from "@/app/actions/contacts";
import type { ActionResult } from "@/lib/types";

type JobOption = { id: string; label: string };

export default function ContactForm({
  jobId,
  jobs,
  compact = false,
}: {
  jobId?: string;
  jobs?: JobOption[];
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(addContact, {
    ok: true,
  } as ActionResult);

  return (
    <form
      action={action}
      className={compact ? "space-y-2" : "rounded-lg border border-slate-300 bg-white p-4 shadow-sm"}
    >
      <div className="flex flex-wrap items-end gap-3">
        {!jobId && (
          <label className="min-w-52">
            <span className="text-xs font-medium text-slate-600">Job *</span>
            <select
              name="jobId"
              required
              defaultValue=""
              className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="" disabled>
                Choose a job…
              </option>
              {(jobs ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {jobId && <input type="hidden" name="jobId" value={jobId} />}
        <label className="min-w-44">
          <span className="text-xs font-medium text-slate-600">Email *</span>
          <input
            name="email"
            type="email"
            required
            placeholder="jane@company.com"
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-40">
          <span className="text-xs font-medium text-slate-600">Name</span>
          <input
            name="name"
            placeholder="optional"
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add contact"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
