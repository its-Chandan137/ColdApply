"use client";

import { useActionState } from "react";
import { updateStatus } from "@/app/actions/dashboard";
import { OUTREACH_STATUSES } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

export default function StatusSelect({
  id,
  value,
}: {
  id: string;
  value: string;
}) {
  const [state, action, pending] = useActionState(
    async (_p: ActionResult, fd: FormData) => updateStatus(fd),
    { ok: true } as ActionResult,
  );

  // Status color pill map
  const getTone = (st: string) => {
    switch (st) {
      case "replied":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "drafted":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "approved":
        return "bg-teal-50 text-teal-800 border-teal-200/80";
      case "sent":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "bounced":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "no_reply":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <span className="inline-flex flex-col gap-0.5">
      <form action={action} className="relative inline-flex items-center">
        <input type="hidden" name="id" value={id} />
        <select
          name="status"
          defaultValue={value}
          disabled={pending}
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
          className={`h-7 appearance-none rounded-lg border pl-2.5 pr-6 text-[11px] font-semibold tracking-wide uppercase transition hover:opacity-90 focus:outline-hidden disabled:opacity-50 cursor-pointer ${getTone(
            value,
          )}`}
        >
          {OUTREACH_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-white text-slate-800">
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 text-current opacity-70">
          {pending ? (
            <svg
              className="h-3 w-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </form>
      {state.error && (
        <span className="max-w-44 text-[11px] font-medium leading-tight text-rose-600">
          {state.error}
        </span>
      )}
    </span>
  );
}
