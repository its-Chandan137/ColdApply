"use client";

import { useActionState, useState } from "react";
import { addJob } from "@/app/actions/jobs";
import type { ActionResult } from "@/lib/types";

const initial: ActionResult = { ok: true };

export default function AddJobForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addJob, initial);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        + Add job
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="text-xs font-medium text-slate-600">Job title *</span>
          <input
            name="title"
            required
            placeholder="Backend Engineer"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Company *</span>
          <input
            name="company"
            required
            placeholder="Acme Corp"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">Job post URL</span>
        <input
          name="url"
          type="url"
          placeholder="https://…"
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">
          Description * (paste the posting text)
        </span>
        <textarea
          name="description"
          required
          rows={8}
          placeholder="Paste the full job description here…"
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Retrieving profile facts & scoring…" : "Save & score"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
      {state.error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.warning && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {state.warning}
        </p>
      )}
      {state.message && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
