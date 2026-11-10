"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OUTREACH_STATUSES } from "@/lib/types";

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";

  useEffect(() => {
    setQ(params.get("q") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("q")]);

  function apply(nextStatus: string, nextQ: string) {
    const sp = new URLSearchParams();
    if (nextStatus) sp.set("status", nextStatus);
    if (nextQ) sp.set("q", nextQ);
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label>
        <span className="text-xs font-medium text-slate-600">Status</span>
        <select
          value={status}
          onChange={(e) => apply(e.target.value, q)}
          className="mt-1 block rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        >
          <option value="">all</option>
          {OUTREACH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-52">
        <span className="text-xs font-medium text-slate-600">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(status, q);
          }}
          placeholder="company, contact, subject…"
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={() => apply(status, q)}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Filter
      </button>
      {(status || q) && (
        <button
          type="button"
          onClick={() => apply("", "")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Clear
        </button>
      )}
    </div>
  );
}
