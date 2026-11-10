import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteJob, rescoreJob } from "@/app/actions/jobs";
import { extractContacts } from "@/app/actions/contacts";
import { draftOutreach } from "@/app/actions/outreach";
import ActionForm from "@/components/ActionForm";
import ContactForm from "@/components/ContactForm";

type Props = { params: Promise<{ id: string }> };

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      outreach: {
        include: { contact: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!job) notFound();

  const reasons = asStrings(job.matchReasons);
  const gaps = asStrings(job.matchGaps);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
            {job.matchScore !== null && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  job.matchScore >= 70
                    ? "bg-emerald-100 text-emerald-700"
                    : job.matchScore >= 40
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {job.matchScore}/100
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.company}
            {job.url && (
              <>
                {" · "}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  job post
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionForm
            action={rescoreJob}
            fields={[{ name: "id", value: job.id }]}
            label="Re-score"
            pendingLabel="Scoring…"
          />
          <ActionForm
            action={deleteJob}
            fields={[{ name: "id", value: job.id }]}
            label="Delete"
            confirmText="Delete this job and its outreach?"
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-700">
            Why it matches
          </h2>
          {reasons.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No reasons recorded.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-700">Gaps</h2>
          {gaps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No gaps recorded.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Job description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
          {job.description}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Contacts</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {job.contacts.length} found
            </span>
            <ActionForm
              action={extractContacts}
              fields={[{ name: "jobId", value: job.id }]}
              label="Extract emails from description"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            />
          </div>
        </div>
        {job.contacts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No contacts yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {job.contacts.map((c) => {
              const hasOutreach = job.outreach.some(
                (o) => o.contactId === c.id && o.kind === "initial",
              );
              const canDraft =
                !hasOutreach && (job.matchScore ?? 0) >= 70;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {c.name ? `${c.name} · ` : ""}
                    <a
                      href={`mailto:${c.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.email}
                    </a>
                    <span className="ml-2 text-xs text-slate-400">
                      {c.source}
                      {c.verified ? " · verified" : ""}
                    </span>
                  </span>
                  {canDraft ? (
                    <ActionForm
                      action={draftOutreach}
                      fields={[
                        { name: "jobId", value: job.id },
                        { name: "contactId", value: c.id },
                      ]}
                      label="Draft email"
                      pendingLabel="Writing draft…"
                      className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
                    />
                  ) : hasOutreach ? (
                    <span className="text-xs text-slate-400">draft exists</span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      needs score ≥ 70
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <ContactForm jobId={job.id} compact />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Outreach</h2>
          <Link
            href="/outreach"
            className="text-xs text-blue-600 hover:underline"
          >
            open outreach queue
          </Link>
        </div>
        {job.outreach.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing drafted yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {job.outreach.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span className="truncate">
                  {o.kind === "followup" ? "↩ " : ""}
                  {o.subject}
                </span>
                <span className="ml-3 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {o.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function JobDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading job…</p>}>
      <JobDetail params={params} />
    </Suspense>
  );
}
