"use client";

import { useActionState, useState } from "react";
import { updateNotes } from "@/app/actions/dashboard";
import type { ActionResult } from "@/lib/types";

export default function NotesInput({
  id,
  value,
}: {
  id: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [state, action, pending] = useActionState(
    async (_p: ActionResult, fd: FormData) => updateNotes(fd),
    { ok: true } as ActionResult,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="max-w-40 truncate rounded border border-slate-200 px-1.5 py-1 text-left text-xs text-slate-500 hover:bg-slate-50"
        title={value || "Add notes"}
      >
        {value || "+ notes"}
      </button>
    );
  }

  return (
    <span className="block min-w-44">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <textarea
          name="notes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Notes…"
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <span className="mt-1 flex gap-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setText(value);
              setOpen(false);
            }}
            className="rounded border border-slate-300 px-2 py-0.5 text-[11px]"
          >
            Close
          </button>
        </span>
      </form>
      {state.error && (
        <span className="text-[11px] text-red-600">{state.error}</span>
      )}
      {state.message && !pending && (
        <span className="text-[11px] text-emerald-600">{state.message}</span>
      )}
    </span>
  );
}
