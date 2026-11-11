"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OUTREACH_STATUSES } from "@/lib/types";

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(initialQ);

  function apply(nextStatus: string, nextQ: string) {
    const sp = new URLSearchParams();
    if (nextStatus) sp.set("status", nextStatus);
    if (nextQ) sp.set("q", nextQ);
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-72">
        {/* Search Input */}
        <div className="relative flex-1 min-w-56">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8293AD]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(status, q);
            }}
            placeholder="Search company, contact, subject…"
            className="h-10 w-full rounded-xl border border-[#E5EAF0] bg-white pl-9 pr-3 text-xs text-[#111827] placeholder-[#8293AD] transition focus:border-[#00BFA5] focus:outline-hidden"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => apply(e.target.value, q)}
            className="h-10 appearance-none rounded-xl border border-[#E5EAF0] bg-white pl-3.5 pr-8 text-xs font-medium text-[#111827] transition focus:border-[#00BFA5] focus:outline-hidden"
          >
            <option value="">All statuses</option>
            {OUTREACH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#8293AD]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => apply(status, q)}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#075B4E] px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#062E29]"
        >
          Apply filter
        </button>
        {(status || q) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              apply("", "");
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5EAF0] bg-white px-3.5 text-xs font-medium text-[#64748B] transition hover:bg-slate-50 hover:text-[#111827]"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
