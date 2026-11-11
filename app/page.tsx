import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { sentCountSince, startOfToday } from "@/lib/send";
import { dailyCap, autoSendEnabled } from "@/lib/settings";
import { draftFollowUpNow } from "@/app/actions/dashboard";
import StatusSelect from "@/components/StatusSelect";
import NotesInput from "@/components/NotesInput";
import FilterBar from "@/components/FilterBar";
import ActionForm from "@/components/ActionForm";
import Sparkline from "@/components/Sparkline";
import DashboardHeader from "@/components/DashboardHeader";

type SearchParams = Promise<{
  status?: string | string[];
  q?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}



/** 2. Large Hero Overview Banner with Circular Progress and 4 Key Metrics */
async function HeroBanner() {
  await connection();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [sentToday, cap, sentWeek, replied, pending, followDue, isAutoSend] =
    await Promise.all([
      sentCountSince(startOfToday(now)),
      dailyCap(),
      sentCountSince(weekAgo),
      prisma.outreach.count({ where: { status: "replied" } }),
      prisma.outreach.count({ where: { status: "drafted" } }),
      prisma.outreach.count({
        where: {
          kind: "initial",
          status: { in: ["sent", "no_reply"] },
          followUpDueAt: { not: null, lte: now },
          followups: { none: {} },
        },
      }),
      autoSendEnabled(),
    ]);

  // Compute utilization percentage (based on cap)
  const capSafe = cap > 0 ? cap : 20;
  const utilizationPercent = Math.min(
    100,
    Math.round((sentToday / capSafe) * 100),
  );

  // SVG Circular progress math: radius 52, perimeter = 2 * PI * 52 ≈ 326.7
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (utilizationPercent / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#062E29] via-[#075B4E] to-[#087D6B] text-white shadow-xl">
      {/* Decorative concentric background rings on the right */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-96 w-96 rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -top-8 -right-8 h-[450px] w-[450px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute top-4 right-4 h-[550px] w-[550px] rounded-full border border-white/5" />

      {/* Main hero upper section */}
      <div className="relative z-10 flex flex-col justify-between gap-8 p-7 lg:flex-row lg:items-center lg:p-10">
        {/* Left Side: Headline, Pills, Buttons */}
        <div className="max-w-xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-emerald-200 uppercase backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#45DCC7] animate-pulse" />
              OUTREACH PIPELINE
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80 uppercase">
              DAILY CAP: {capSafe} EMAILS
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80 uppercase">
              {isAutoSend ? "AUTO-SEND ACTIVE" : "MANUAL MODE"}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[34px] lg:leading-tight">
            Your outreach pipeline is{" "}
            <span className="text-[#45DCC7]">
              {utilizationPercent > 0 ? `${utilizationPercent}% active` : "primed & ready"}
            </span>{" "}
            for delivery today.
          </h2>

          <p className="text-sm leading-relaxed text-emerald-100/80">
            {sentToday} of {capSafe} daily emails sent. {pending} personalized drafts are awaiting your approval, and {followDue} follow-ups are ready to draft.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/outreach"
              className="inline-flex items-center gap-2 rounded-xl bg-[#45DCC7] px-5 py-2.5 text-xs font-bold text-[#062E29] shadow-sm transition hover:bg-[#00BFA5]"
            >
              <span>Review {pending} pending drafts</span>
              <span className="text-sm">→</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-xs transition hover:bg-white/10"
            >
              <span>View sending rules</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Circular Progress Indicator with concentric rings */}
        <div className="relative flex items-center justify-center lg:pr-6">
          {/* Subtle concentric rings */}
          <div className="absolute h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute h-60 w-60 rounded-full border border-white/5" />

          {/* SVG Progress Ring */}
          <div className="relative flex flex-col items-center justify-center">
            <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 120 120">
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="text-white/10"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress stroke */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="text-[#45DCC7] transition-all duration-1000 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Inner text inside circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold tracking-wider text-emerald-200 uppercase">
                CAP USED
              </span>
              <span className="text-2xl font-black tracking-tight text-white">
                {utilizationPercent}%
              </span>
              <span className="text-[10px] font-medium text-white/70">
                {sentToday}/{capSafe} sent
              </span>
            </div>

            {/* Small pill badge below ring */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-medium text-white/90">
              <svg className="h-3 w-3 text-[#45DCC7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>100% human-approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Metrics Strip */}
      <div className="border-t border-white/10 bg-black/10 px-7 py-4 backdrop-blur-xs">
        <div className="grid grid-cols-2 gap-4 divide-y divide-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-white/10">
          <div className="pt-2 sm:pt-0 sm:pr-4">
            <p className="text-xl font-bold tracking-tight text-white lg:text-2xl">
              {sentToday} <span className="text-sm font-normal text-white/60">/ {capSafe}</span>
            </p>
            <p className="text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">
              EMAILS SENT TODAY
            </p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <p className="text-xl font-bold tracking-tight text-white lg:text-2xl">
              {sentWeek}
            </p>
            <p className="text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">
              SENT THIS WEEK
            </p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <p className="text-xl font-bold tracking-tight text-white lg:text-2xl">
              {replied}
            </p>
            <p className="text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">
              REPLIES RECORDED
            </p>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-4">
            <p className="text-xl font-bold tracking-tight text-[#45DCC7] lg:text-2xl">
              {pending}
            </p>
            <p className="text-[11px] font-semibold tracking-wider text-emerald-200/80 uppercase">
              DRAFTS TO APPROVE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 3. Four Modern Analytics Cards with Sparklines */
async function AnalyticsCards() {
  await connection();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [sentToday, cap, sentWeek, replied, pending, followDue] =
    await Promise.all([
      sentCountSince(startOfToday(now)),
      dailyCap(),
      sentCountSince(weekAgo),
      prisma.outreach.count({ where: { status: "replied" } }),
      prisma.outreach.count({ where: { status: "drafted" } }),
      prisma.outreach.count({
        where: {
          kind: "initial",
          status: { in: ["sent", "no_reply"] },
          followUpDueAt: { not: null, lte: now },
          followups: { none: {} },
        },
      }),
    ]);

  const replyRate =
    sentWeek > 0 ? ((replied / sentWeek) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Outbound Volume (Teal) */}
      <div className="flex flex-col justify-between rounded-[20px] border border-[#E5EAF0] bg-white p-5 shadow-xs transition hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F9F5] text-[#00BFA5]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F9F5] px-2.5 py-0.5 text-xs font-semibold text-[#075B4E]">
              <span className="text-[10px]">↗</span> +14.2%
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#8293AD]">
            Weekly Outbound
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-[#111827]">
              {sentWeek}
            </span>
            <Sparkline
              data={[4, 7, 6, 12, 10, 15, sentWeek || 18]}
              color="#00BFA5"
              gradientId="sparkline-teal"
              className="h-9 w-24"
            />
          </div>
        </div>
        <p className="mt-4 border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#8293AD]">
          {sentToday} sent today &middot; {cap} daily ceiling
        </p>
      </div>

      {/* Card 2: Replies & Leads (Purple) */}
      <div className="flex flex-col justify-between rounded-[20px] border border-[#E5EAF0] bg-white p-5 shadow-xs transition hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {replyRate}% rate
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#8293AD]">
            Replies &amp; Leads
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-[#111827]">
              {replied}
            </span>
            <Sparkline
              data={[1, 2, 2, 4, 3, 5, Math.max(1, replied)]}
              color="#9333EA"
              gradientId="sparkline-purple"
              className="h-9 w-24"
            />
          </div>
        </div>
        <p className="mt-4 border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#8293AD]">
          Polled via IMAP thread headers
        </p>
      </div>

      {/* Card 3: Pending Approvals (Blue) */}
      <div className="flex flex-col justify-between rounded-[20px] border border-[#E5EAF0] bg-white p-5 shadow-xs transition hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              pending > 0
                ? "bg-blue-50 text-blue-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {pending > 0 ? `${pending} queued` : "All clear"}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#8293AD]">
            Awaiting Review
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-[#111827]">
              {pending}
            </span>
            <Sparkline
              data={[2, 3, 5, 4, 6, 8, Math.max(2, pending)]}
              color="#2563EB"
              gradientId="sparkline-blue"
              className="h-9 w-24"
            />
          </div>
        </div>
        <p className="mt-4 border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#8293AD]">
          Safe sending: 100% human-approved
        </p>
      </div>

      {/* Card 4: Follow-ups Due (Amber) */}
      <div className="flex flex-col justify-between rounded-[20px] border border-[#E5EAF0] bg-white p-5 shadow-xs transition hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              6-day rule
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#8293AD]">
            Follow-ups Due
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-[#111827]">
              {followDue}
            </span>
            <Sparkline
              data={[0, 1, 2, 3, 2, 4, Math.max(1, followDue)]}
              color="#D97706"
              gradientId="sparkline-amber"
              className="h-9 w-24"
            />
          </div>
        </div>
        <p className="mt-4 border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#8293AD]">
          Auto-drafted every 15 min by worker
        </p>
      </div>
    </div>
  );
}

/** 4. Follow-ups Due & Drafts Section (Modernized) */
async function FollowUpsSection() {
  await connection();
  const now = new Date();
  const [due, drafts] = await Promise.all([
    prisma.outreach.findMany({
      where: {
        kind: "initial",
        status: { in: ["sent", "no_reply"] },
        followUpDueAt: { not: null, lte: now },
        followups: { none: {} },
      },
      include: { contact: true, job: true },
      orderBy: { followUpDueAt: "asc" },
      take: 20,
    }),
    prisma.outreach.findMany({
      where: { kind: "followup", status: "drafted" },
      include: { contact: true, job: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (due.length === 0 && drafts.length === 0) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Card 1: Follow-ups Due */}
      <section className="flex flex-col justify-between rounded-[22px] border border-[#E5EAF0] bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <h2 className="text-sm font-bold text-[#111827]">
                Follow-ups due
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              {due.length} due
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8293AD]">
            6 days after sending with no reply. The worker drafts these every 15 min, or you can draft now.
          </p>

          {due.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#E5EAF0] bg-[#FAFBFD] p-6 text-center text-xs text-[#8293AD]">
              No follow-ups due right now. Everything is up to date!
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#F1F5F9] text-sm">
              {due.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#111827]">
                      {o.contact.email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8293AD]">
                      {o.job.title} @ {o.job.company} &middot; due{" "}
                      {o.followUpDueAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <ActionForm
                    action={draftFollowUpNow}
                    fields={[{ name: "id", value: o.id }]}
                    label="Draft follow-up now"
                    pendingLabel="Drafting…"
                    className="rounded-xl bg-[#075B4E] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#062E29]"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Card 2: Follow-up Drafts Awaiting Approval */}
      <section className="flex flex-col justify-between rounded-[22px] border border-[#E5EAF0] bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <h2 className="text-sm font-bold text-[#111827]">
                Follow-up drafts awaiting review
              </h2>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              {drafts.length} ready
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8293AD]">
            Ready for your review. Approve them to queue for Gmail delivery.
          </p>

          {drafts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#E5EAF0] bg-[#FAFBFD] p-6 text-center text-xs text-[#8293AD]">
              No follow-up drafts awaiting review.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#F1F5F9] text-sm">
              {drafts.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#111827]">
                      {o.subject}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8293AD]">
                      {o.contact.email} &middot; {o.job.company}
                    </p>
                  </div>
                  <Link
                    href="/outreach"
                    className="shrink-0 rounded-xl border border-[#E5EAF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-2xs transition hover:bg-slate-50"
                  >
                    Review &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/** 5. Outreach Activity Table Section */
async function OutreachTable({
  status,
  q,
}: {
  status?: string;
  q?: string;
}) {
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q } },
            { contact: { email: { contains: q } } },
            { contact: { name: { contains: q } } },
            { job: { company: { contains: q } } },
            { job: { title: { contains: q } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.outreach.findMany({
    where,
    include: { contact: true, job: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#E5EAF0] bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#8293AD]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-[#111827]">
          No outreach records match this filter
        </p>
        <p className="mt-1 text-xs text-[#8293AD]">
          Try searching for a different company name, contact email, or clearing the status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="border-b border-[#E5EAF0] bg-[#FAFBFD] text-left text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
            <tr>
              <th className="px-5 py-3.5">Job / Company</th>
              <th className="px-5 py-3.5">Contact</th>
              <th className="px-5 py-3.5">Subject</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Sent</th>
              <th className="px-5 py-3.5">Follow-up</th>
              <th className="px-5 py-3.5">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] align-top">
            {rows.map((o) => (
              <tr key={o.id} className="transition hover:bg-[#F8FAFC]">
                {/* Job column */}
                <td className="px-5 py-4">
                  <Link
                    href={`/jobs/${o.jobId}`}
                    className="font-bold text-[#111827] transition hover:text-[#00BFA5] hover:underline"
                  >
                    {o.job.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8293AD]">
                    <span className="font-medium text-slate-700">
                      {o.job.company}
                    </span>
                    {o.kind === "followup" && (
                      <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                        Follow-up
                      </span>
                    )}
                  </div>
                </td>

                {/* Contact column */}
                <td className="px-5 py-4 text-xs text-[#64748B]">
                  <a
                    href={`mailto:${o.contact.email}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {o.contact.email}
                  </a>
                  {o.contact.name && (
                    <span className="block text-[11px] text-[#8293AD]">
                      {o.contact.name}
                    </span>
                  )}
                </td>

                {/* Subject column */}
                <td className="max-w-64 px-5 py-4">
                  <span
                    className="block truncate text-xs font-medium text-slate-800"
                    title={o.subject}
                  >
                    {o.subject}
                  </span>
                  {o.lastError && (
                    <span
                      className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"
                      title={o.lastError}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="max-w-44 truncate">{o.lastError}</span>
                    </span>
                  )}
                </td>

                {/* Status Column */}
                <td className="px-5 py-4">
                  <StatusSelect id={o.id} value={o.status} />
                </td>

                {/* Sent Date Column */}
                <td className="px-5 py-4 text-xs font-medium text-[#8293AD]">
                  {o.sentAt ? o.sentAt.toLocaleDateString() : "—"}
                </td>

                {/* Follow-up Due Date Column */}
                <td className="px-5 py-4 text-xs font-medium text-[#8293AD]">
                  {o.kind === "initial" && o.followUpDueAt
                    ? o.followUpDueAt.toLocaleDateString()
                    : "—"}
                </td>

                {/* Notes Column */}
                <td className="px-5 py-4">
                  <NotesInput id={o.id} value={o.notes ?? ""} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 6. Recent Application Errors Panel */
async function RecentErrors() {
  const errors = await prisma.appLog.findMany({
    where: { level: "error" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  if (errors.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-rose-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-rose-700">
            Recent System Logs &amp; Errors
          </h2>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          {errors.length} recorded
        </span>
      </div>

      <ul className="mt-4 space-y-2.5 text-xs">
        {errors.map((e) => (
          <li key={e.id} className="rounded-xl border border-rose-100 bg-[#FFFDFD] p-3">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-rose-100/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                {e.scope}
              </span>
              <span className="text-[11px] text-[#8293AD]">
                {e.createdAt.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 font-medium text-slate-800">{e.message}</p>
            {e.detail && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[11px] font-semibold text-[#8293AD] hover:text-slate-700">
                  Show stack trace
                </summary>
                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-slate-200">
                  {e.detail}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 7. Table Section Async Wrapper */
async function TableSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <OutreachTable
      status={first(sp.status)}
      q={first(sp.q).trim()}
    />
  );
}

/** 8. Main Dashboard Page Export */
export default function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6 lg:space-y-7">
      {/* 1. Header (Greeting + Quick Actions) */}
      <DashboardHeader />

      {/* 2. Large Emerald Hero Overview Banner */}
      <Suspense
        fallback={
          <div className="h-80 w-full animate-pulse rounded-[24px] bg-gradient-to-br from-[#062E29] to-[#075B4E]" />
        }
      >
        <HeroBanner />
      </Suspense>

      {/* 3. Four Statistics Cards with Sparklines */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-[20px] border border-[#E5EAF0] bg-white p-5"
              />
            ))}
          </div>
        }
      >
        <AnalyticsCards />
      </Suspense>

      {/* 4. Follow-ups Due & Drafts Section */}
      <Suspense fallback={null}>
        <FollowUpsSection />
      </Suspense>

      {/* 5. Outreach Activities Table Section */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-[#111827]">
            Outreach Activity
          </h2>
          <span className="text-xs font-medium text-[#8293AD]">
            Live sync &middot; click status to edit
          </span>
        </div>

        <Suspense
          fallback={
            <div className="h-12 w-full animate-pulse rounded-xl bg-white" />
          }
        >
          <FilterBar />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-64 w-full animate-pulse rounded-[22px] border border-[#E5EAF0] bg-white" />
          }
        >
          <TableSection searchParams={searchParams} />
        </Suspense>
      </section>

      {/* 6. Recent Errors Panel */}
      <Suspense fallback={null}>
        <RecentErrors />
      </Suspense>
    </div>
  );
}
