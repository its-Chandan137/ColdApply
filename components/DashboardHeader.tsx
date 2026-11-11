"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardHeader() {
  const [dateString, setDateString] = useState("");

  useEffect(() => {
    setDateString(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00BFA5]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
            {dateString || "TODAY"}
          </span>
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
          Good morning, Vedhas
        </h1>
        <p className="mt-1 text-sm text-[#8293AD]">
          Here&apos;s what&apos;s happening across your outreach engine and active pipeline today.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/outreach"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5EAF0] bg-white px-4 text-xs font-semibold text-[#111827] shadow-2xs transition hover:bg-slate-50"
        >
          <svg
            className="h-4 w-4 text-[#8293AD]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Review drafts</span>
        </Link>
        <Link
          href="/jobs"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#00BFA5] px-4 text-xs font-bold text-[#062E29] shadow-2xs transition hover:bg-[#45DCC7]"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New job</span>
        </Link>
      </div>
    </div>
  );
}

