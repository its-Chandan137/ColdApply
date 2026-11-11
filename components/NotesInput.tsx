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
        className="group flex max-w-44 items-center gap-1.5 truncate rounded-lg border border-[#E5EAF0] bg-white px-2 py-1 text-left text-xs text-[#8293AD] transition hover:border-[#00BFA5] hover:text-[#111827]"
        title={value || "Click to add notes"}
      >
        <span className="truncate">{value || "+ add note"}</span>
      </button>
    );
  }

  return (
    <div className="min-w-52 rounded-xl border border-[#E5EAF0] bg-white p-2 shadow-md">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <textarea
          name="notes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Add context or meeting notes…"
          className="w-full resize-none rounded-lg border border-[#E5EAF0] p-2 text-xs text-[#111827] placeholder-[#8293AD] focus:border-[#00BFA5] focus:outline-hidden"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#075B4E] px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs transition hover:bg-[#062E29] disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save note"}
            </button>
            <button
              type="button"
              onClick={() => {
                setText(value);
                setOpen(false);
              }}
              className="rounded-lg border border-[#E5EAF0] bg-white px-2 py-1 text-[11px] font-medium text-[#64748B] hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {state.error && (
            <span className="text-[10px] text-rose-600">{state.error}</span>
          )}
          {state.message && !pending && (
            <span className="text-[10px] text-emerald-600">Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
