import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { sentCountSince, startOfToday } from "@/lib/send";
import { dailyCap } from "@/lib/settings";
import { draftFollowUpNow } from "@/app/actions/dashboard";
import StatusSelect from "@/components/StatusSelect";
import NotesInput from "@/components/NotesInput";
import FilterBar from "@/components/FilterBar";
import ActionForm from "@/components/ActionForm";

type SearchParams = Promise<{
  status?: string | string[];
  q?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

async function Stats() {
  await connection(); // current time + fresh counts are request-time data
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [sentToday, cap, sentWeek, replied, bounced, pending, followDue] =
    await Promise.all([
      sentCountSince(startOfToday(now)),
      dailyCap(),
      sentCountSince(weekAgo),
      prisma.outreach.count({ where: { status: "replied" } }),
      prisma.outreach.count({ where: { status: "bounced" } }),
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

  const cards = [
    { label: "Sent today", value: `${sentToday}/${cap}`, tone: "text-slate-900" },
    { label: "Sent this week", value: sentWeek, tone: "text-slate-900" },
    { label: "Replied", value: replied, tone: "text-emerald-700" },
    { label: "Bounced", value: bounced, tone: "text-red-600" },
    { label: "Awaiting approval", value: pending, tone: "text-blue-700" },
    { label: "Follow-ups due", value: followDue, tone: "text-amber-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {c.label}
          </p>
          <p className={`mt-1 text-2xl font-semibold ${c.tone}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

async function FollowUps() {
  await connection(); // follow-up due times depend on the current time
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
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Follow-ups due</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          6 days after sending with no reply. The worker drafts these every 15
          min; you can also draft now. Every follow-up needs approval.
        </p>
        {due.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nothing due.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {due.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {o.contact.email}
                  </span>
                  <span className="text-xs text-slate-500">
                    {o.job.title} @ {o.job.company} · due{" "}
                    {o.followUpDueAt?.toLocaleDateString()}
                  </span>
                </span>
                <ActionForm
                  action={draftFollowUpNow}
                  fields={[{ name: "id", value: o.id }]}
                  label="Draft follow-up now"
                  pendingLabel="Writing…"
                  className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">
          Follow-up drafts awaiting approval
        </h2>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {drafts.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {o.subject}
                  </span>
                  <span className="text-xs text-slate-500">
                    {o.contact.email} · {o.job.company}
                  </span>
                </span>
                <Link
                  href="/outreach"
                  className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

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
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No outreach matches this filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Job</th>
            <th className="px-3 py-2.5">Contact</th>
            <th className="px-3 py-2.5">Subject</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Sent</th>
            <th className="px-3 py-2.5">Follow-up</th>
            <th className="px-3 py-2.5">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-top">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5">
                <Link
                  href={`/jobs/${o.jobId}`}
                  className="font-medium hover:underline"
                >
                  {o.job.title}
                </Link>
                <span className="block text-xs text-slate-500">
                  {o.job.company}
                  {o.kind === "followup" ? " · follow-up" : ""}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-600">
                {o.contact.email}
                {o.contact.name && (
                  <span className="block text-xs text-slate-400">
                    {o.contact.name}
                  </span>
                )}
              </td>
              <td className="max-w-56 px-3 py-2.5">
                <span className="block truncate" title={o.subject}>
                  {o.subject}
                </span>
                {o.lastError && (
                  <span
                    className="mt-0.5 block truncate text-[11px] text-red-600"
                    title={o.lastError}
                  >
                    ⚠ {o.lastError}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <StatusSelect id={o.id} value={o.status} />
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {o.sentAt ? o.sentAt.toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {o.kind === "initial" && o.followUpDueAt
                  ? o.followUpDueAt.toLocaleDateString()
                  : "—"}
              </td>
              <td className="px-3 py-2.5">
                <NotesInput id={o.id} value={o.notes ?? ""} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function RecentErrors() {
  const errors = await prisma.appLog.findMany({
    where: { level: "error" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (errors.length === 0) return null;

  return (
    <section className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-red-700">Recent errors</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {errors.map((e) => (
          <li key={e.id} className="border-b border-red-50 pb-2 last:border-0">
            <span className="text-xs font-medium uppercase text-slate-400">
              {e.scope}
            </span>{" "}
            <span className="text-slate-700">{e.message}</span>
            <span className="ml-2 text-xs text-slate-400">
              {e.createdAt.toLocaleString()}
            </span>
            {e.detail && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-500">
                  details
                </summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px] text-slate-600">
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

export default function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approve drafts on{" "}
          <Link href="/outreach" className="text-blue-600 hover:underline">
            Outreach
          </Link>
          , everything else is here.
        </p>
      </div>

      <Suspense
        fallback={<p className="text-sm text-slate-500">Loading stats…</p>}
      >
        <Stats />
      </Suspense>

      <Suspense fallback={null}>
        <FollowUps />
      </Suspense>

      <section className="space-y-3">
        <Suspense
          fallback={<p className="text-sm text-slate-500">Loading filters…</p>}
        >
          <FilterBar />
        </Suspense>
        <Suspense
          fallback={<p className="text-sm text-slate-500">Loading outreach…</p>}
        >
          <TableSection searchParams={searchParams} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <RecentErrors />
      </Suspense>
    </div>
  );
}

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
