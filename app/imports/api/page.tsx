import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getApiImportSettings } from "@/lib/import/settings";
import { runApiImportAction } from "@/app/actions/imports";
import ApiImportSettingsForm from "@/components/imports/ApiImportSettingsForm";
import RunImportButton from "@/components/imports/RunImportButton";
import FlowTree, { type FlowNode } from "@/components/FlowTree";

function statusTone(status: string): "idle" | "active" | "success" | "warn" | "error" {
  if (status === "running") return "active";
  if (status === "success") return "success";
  if (status === "partial") return "warn";
  if (status === "failed") return "error";
  return "idle";
}

function buildFlow(settings: Awaited<ReturnType<typeof getApiImportSettings>>, run: any | null): FlowNode[] {
  const r = run;
  const s = statusTone(r?.status || "idle");
  const providerLabel = settings.provider === "adzuna" ? "Adzuna" : "Remotive";
  return [
    {
      id: "source",
      label: `Source: Job API (${providerLabel})`,
      value: settings.enabled ? "Enabled (worker)" : "Manual only",
      sub: `Query: "${settings.query || "(none)"}"${settings.location ? ` · Location: ${settings.location}` : ""} · Max: ${settings.maxResults}`,
      status: settings.enabled ? "success" : "idle",
      children: [
        {
          id: "fetch",
          label: "Fetch jobs from API",
          value: r ? r.fetched : "—",
          sub: r ? `Provider: ${(r.details as any)?.provider || settings.provider}` : "HTTP request to provider",
          status: r ? s : "idle",
        },
        {
          id: "parse",
          label: "Normalize results",
          value: r ? r.parsed : "—",
          sub: "Map to title/company/URL/description",
          status: r ? s : "idle",
          children: [
            {
              id: "import",
              label: "Dedupe & import jobs",
              value: r ? r.imported : "—",
              sub: r ? `Duplicates skipped: ${r.duplicates}` : "By URL / externalId / title+company",
              status: r ? (r.imported > 0 ? "success" : s) : "idle",
              children: [
                {
                  id: "score",
                  label: "Score against profile",
                  value: r ? r.scored : "—",
                  sub: "LLM + retrieved profile chunks",
                  status: r ? (r.scored > 0 ? "success" : s) : "idle",
                },
                {
                  id: "contacts",
                  label: "Extract contacts",
                  value: r ? r.contactsFound : "—",
                  sub: "Emails found in job description",
                  status: r ? (r.contactsFound > 0 ? "success" : s) : "idle",
                },
                {
                  id: "draft",
                  label: "Auto-draft outreach",
                  value: r ? r.drafted : "—",
                  sub: settings.autoDraft
                    ? `Score ≥ ${settings.minDraftScore}, contact required (needs approval)`
                    : "Disabled in settings",
                  status: r ? (r.drafted > 0 ? "success" : s) : settings.autoDraft ? "idle" : "warn",
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

async function ApiImportsPanel() {
  const [settings, runs, latest] = await Promise.all([
    getApiImportSettings(),
    prisma.importRun.findMany({
      where: { kind: "job_api" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.importRun.findFirst({
      where: { kind: "job_api" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestJobs = latest
    ? await prisma.job.findMany({
        where: { importRunId: latest.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, company: true, matchScore: true, source: true, createdAt: true },
      })
    : [];

  const flow = buildFlow(settings, latest);
  const details = (latest?.details as any) || {};
  const errMsgs: string[] = Array.isArray(details.errorMessages) ? details.errorMessages : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00BFA5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
              Import · Free Job APIs
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827]">
            Job API Importer
          </h1>
          <p className="mt-1 text-sm text-[#8293AD]">
            Search and import jobs from Remotive or Adzuna, then score, extract contacts, and draft outreach.
          </p>
        </div>
        <RunImportButton
          action={runApiImportAction}
          label="Run import now"
          pendingLabel="Fetching from API…"
        />
      </div>

      <FlowTree title="Pipeline flow (latest run)" nodes={flow} />

      {latest && (
        <div className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#111827]">Latest run</h3>
          <div className="mt-2 grid gap-2 text-sm text-[#64748B] sm:grid-cols-2 lg:grid-cols-4">
            <p>Status: <span className="font-semibold text-[#111827]">{latest.status}</span></p>
            <p>Trigger: <span className="font-semibold text-[#111827]">{latest.trigger}</span></p>
            <p>Started: <span className="font-semibold text-[#111827]">{latest.startedAt.toLocaleString()}</span></p>
            <p>Finished: <span className="font-semibold text-[#111827]">{latest.finishedAt ? latest.finishedAt.toLocaleString() : "—"}</span></p>
          </div>
          {latest.message && <p className="mt-2 text-sm text-[#111827]">{latest.message}</p>}
          {errMsgs.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-semibold">Errors</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {errMsgs.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <ApiImportSettingsForm settings={settings} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#111827]">Recent import runs</h3>
          {runs.length === 0 ? (
            <p className="mt-2 text-sm text-[#8293AD]">No runs yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
                  <tr><th className="py-2">Time</th><th className="py-2">Status</th><th className="py-2">Imported</th><th className="py-2">Dupes</th><th className="py-2">Drafted</th></tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-xs text-[#64748B]">{r.createdAt.toLocaleString()}</td>
                      <td className="py-2 font-medium">{r.status}</td>
                      <td className="py-2">{r.imported}</td>
                      <td className="py-2">{r.duplicates}</td>
                      <td className="py-2">{r.drafted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#111827]">Jobs from latest run</h3>
          {latestJobs.length === 0 ? (
            <p className="mt-2 text-sm text-[#8293AD]">No imported jobs in latest run.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {latestJobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#F1F5F9] px-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/jobs/${j.id}`} className="font-semibold text-[#111827] hover:text-[#00BFA5] hover:underline">
                      {j.title}
                    </Link>
                    <p className="text-xs text-[#8293AD] truncate">{j.company} · score {j.matchScore ?? "—"}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase text-[#8293AD]">{j.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApiImportsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-[22px] bg-white border border-[#E5EAF0]" />}>
      <ApiImportsPanel />
    </Suspense>
  );
}
