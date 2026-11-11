"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteJob } from "@/app/actions/jobs";
import type { ActionResult } from "@/lib/types";

export default function DeleteJobButton({
  jobId,
  jobLabel,
}: {
  jobId: string;
  jobLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, fd: FormData) => deleteJob(fd),
    { ok: true } as ActionResult,
  );

  useEffect(() => {
    if (state.ok && state.message) {
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-job-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-[22px] border border-[#E5EAF0] bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2
                  id="delete-job-title"
                  className="text-base font-bold text-[#111827]"
                >
                  Delete job?
                </h2>
                <p className="mt-1 text-sm text-[#8293AD]">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-[#111827]">
                    {jobLabel}
                  </span>
                  ? This will also remove its contacts and outreach. This action
                  cannot be undone.
                </p>
              </div>
            </div>

            {state.error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                Cancel
              </button>
              <form action={formAction}>
                <input type="hidden" name="id" value={jobId} />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
