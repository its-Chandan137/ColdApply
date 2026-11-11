"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";

const initial: ActionResult = { ok: true };

export default function RunImportButton({
  action,
  label,
  pendingLabel,
  className = "rounded-lg bg-[#00BFA5] px-4 py-2 text-sm font-semibold text-[#062E29] hover:bg-[#2dd4be] disabled:opacity-50",
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction}>
        <button type="submit" disabled={pending} className={className}>
          {pending ? pendingLabel ?? "Running…" : label}
        </button>
      </form>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      {state.message && <span className="text-sm text-emerald-600">{state.message}</span>}
    </div>
  );
}
