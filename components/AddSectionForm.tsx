"use client";

import { useActionState, useState } from "react";
import { addSection } from "@/app/actions/profile";
import type { ActionResult } from "@/lib/types";
import { SECTION_TYPES } from "@/lib/types";

const initial: ActionResult = { ok: true };

export default function AddSectionForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (_p: ActionResult, fd: FormData) => addSection(fd),
    initial,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        + Add section
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-48">
          <span className="text-xs font-medium text-slate-600">Title</span>
          <input
            name="title"
            required
            placeholder="e.g. Senior TypeScript Engineer @ Acme"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Type</span>
          <select
            name="type"
            defaultValue="other"
            className="mt-1 block rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">Content</span>
        <textarea
          name="content"
          required
          rows={5}
          placeholder="Facts only - these get embedded and used in emails."
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Saving & embedding…" : "Add section"}
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
      {state.message && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
