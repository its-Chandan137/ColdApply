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

  return (
    <span className="inline-flex flex-col gap-0.5">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <select
          name="status"
          defaultValue={value}
          disabled={pending}
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
        >
          {OUTREACH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </form>
      {state.error && (
        <span className="max-w-40 text-[11px] leading-tight text-red-600">
          {state.error}
        </span>
      )}
    </span>
  );
}
