import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { rescoreJob } from "@/app/actions/jobs";
import AddJobForm from "@/components/AddJobForm";
import ActionForm from "@/components/ActionForm";
import DeleteJobButton from "@/components/DeleteJobButton";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[#8293AD]">
        unscored
      </span>
    );
  }
  const tone =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
      : score >= 40
        ? "bg-amber-50 text-amber-700 border border-amber-200/80"
        : "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${tone}`}
    >
      <span>{score}</span>
      <span className="text-[10px] opacity-70">/100</span>
    </span>
  );
}

async function JobList() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, outreach: true } } },
  });

  if (jobs.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#E5EAF0] bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F9F5] text-[#00BFA5]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-bold text-[#111827]">No job postings yet</p>
        <p className="mt-1 text-xs text-[#8293AD]">
          Add a posting above. The LLM will score it against your embedded profile chunks.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E5EAF0] bg-[#FAFBFD] text-left text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
            <tr>
              <th className="px-5 py-3.5">Job Title</th>
              <th className="px-5 py-3.5">Company</th>
              <th className="px-5 py-3.5">Match Score</th>
              <th className="px-5 py-3.5">Contacts</th>
              <th className="px-5 py-3.5">Outreach</th>
              <th className="px-5 py-3.5">Date Added</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {jobs.map((j) => (
              <tr key={j.id} className="transition hover:bg-[#F8FAFC]">
                <td className="px-5 py-4">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-bold text-[#111827] transition hover:text-[#00BFA5] hover:underline"
                  >
                    {j.title}
                  </Link>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">
                  {j.company}
                </td>
                <td className="px-5 py-4">
                  <ScoreBadge score={j.matchScore} />
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#8293AD]">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                    {j._count.contacts}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#8293AD]">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                    {j._count.outreach}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs font-medium text-[#8293AD]">
                  {j.createdAt.toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <ActionForm
                      action={rescoreJob}
                      fields={[{ name: "id", value: j.id }]}
                      label="Re-score"
                      pendingLabel="Scoring…"
                      className="rounded-lg border border-[#E5EAF0] bg-white px-2.5 py-1 text-xs font-semibold text-[#111827] hover:bg-[#F8FAFC] disabled:opacity-50"
                    />
                    <DeleteJobButton
                      jobId={j.id}
                      jobLabel={`${j.title} @ ${j.company}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00BFA5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
              Pipeline Targets
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827]">
            Job Postings
          </h1>
          <p className="mt-1 text-sm text-[#8293AD]">
            Saved postings are automatically scored 0–100 using cosine retrieval over your profile facts.
          </p>
        </div>
      </div>

      <AddJobForm />

      <Suspense
        fallback={
          <div className="h-64 w-full animate-pulse rounded-[22px] border border-[#E5EAF0] bg-white" />
        }
      >
        <JobList />
      </Suspense>
    </div>
  );
}
