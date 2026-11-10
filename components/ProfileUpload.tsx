"use client";

import { useActionState } from "react";
import { uploadResume } from "@/app/actions/profile";
import type { ActionResult } from "@/lib/types";

const initial: ActionResult = { ok: true };

export default function ProfileUpload() {
  const [state, action, pending] = useActionState(uploadResume, initial);

  return (
    <form
      action={action}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold">Import resume (PDF)</h2>
      <p className="mt-1 text-xs text-slate-500">
        Extracts text, asks the LLM for structured sections, then chunks and
        embeds them. This replaces the current profile sections.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="resume"
          accept="application/pdf,.pdf"
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Extracting & embedding…" : "Upload & extract"}
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
      {state.warning && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {state.warning}
        </p>
      )}
    </form>
  );
}
