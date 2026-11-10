import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import AddJobForm from "@/components/AddJobForm";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        unscored
      </span>
    );
  }
  const tone =
    score >= 70
      ? "bg-emerald-100 text-emerald-700"
      : score >= 40
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {score}/100
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
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">No jobs yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Add a posting and it will be scored against your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Job</th>
            <th className="px-4 py-2.5">Company</th>
            <th className="px-4 py-2.5">Score</th>
            <th className="px-4 py-2.5">Contacts</th>
            <th className="px-4 py-2.5">Outreach</th>
            <th className="px-4 py-2.5">Added</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((j) => (
            <tr key={j.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/jobs/${j.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {j.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{j.company}</td>
              <td className="px-4 py-3">
                <ScoreBadge score={j.matchScore} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {j._count.contacts}
              </td>
              <td className="px-4 py-3 text-slate-600">{j._count.outreach}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {j.createdAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saved postings are scored 0-100 with retrieved profile facts.
          </p>
        </div>
      </div>

      <AddJobForm />

      <Suspense fallback={<p className="text-sm text-slate-500">Loading jobs…</p>}>
        <JobList />
      </Suspense>
    </div>
  );
}
