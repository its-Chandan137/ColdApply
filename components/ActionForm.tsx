"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";

type Action = (formData: FormData) => Promise<ActionResult>;

/**
 * Generic server-action form button with pending state + inline error/message
 * display, so failures are never silent.
 */
export default function ActionForm({
  action,
  fields,
  label,
  pendingLabel,
  confirmText,
  className = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50",
  errorClassName = "text-xs text-red-600",
}: {
  action: Action;
  fields: Array<{ name: string; value: string }>;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  className?: string;
  errorClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, fd: FormData) => action(fd),
    { ok: true } as ActionResult,
  );

  return (
    <span className="inline-flex flex-col gap-1">
      <form
        action={formAction}
        onSubmit={
          confirmText
            ? (e) => {
                if (!confirm(confirmText)) e.preventDefault();
              }
            : undefined
        }
      >
        {fields.map((f) => (
          <input key={f.name} type="hidden" name={f.name} value={f.value} />
        ))}
        <button type="submit" disabled={pending} className={className}>
          {pending ? (pendingLabel ?? "Working…") : label}
        </button>
      </form>
      {state.error && <span className={errorClassName}>{state.error}</span>}
      {state.message && (
        <span className="text-xs text-emerald-600">{state.message}</span>
      )}
      {state.warning && (
        <span className="text-xs text-amber-600">{state.warning}</span>
      )}
    </span>
  );
}
