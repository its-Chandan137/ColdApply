import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { getApiImportSettings } from "./settings";
import { processImportedJobs } from "./pipeline";
import type { NormalizedJob } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchRemotive(query: string, max: number): Promise<NormalizedJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (query.trim()) url.searchParams.set("search", query.trim());
  url.searchParams.set("limit", String(Math.min(max, 50)));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "ColdAuto/1.0 (job import)" },
  });
  if (!res.ok) throw new Error(`Remotive API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    jobs?: Array<{
      id?: number;
      title?: string;
      company_name?: string;
      url?: string;
      description?: string;
      candidate_required_location?: string;
    }>;
  };

  return (data.jobs ?? []).map((j) => ({
    title: j.title || "Untitled",
    company: j.company_name || "Unknown",
    url: j.url || null,
    description: stripHtml(j.description || ""),
    externalId: j.id != null ? String(j.id) : null,
    location: j.candidate_required_location || null,
  }));
}

async function fetchAdzuna(opts: {
  appId: string;
  appKey: string;
  country: string;
  query: string;
  location: string;
  max: number;
}): Promise<NormalizedJob[]> {
  if (!opts.appId || !opts.appKey) {
    throw new Error("Adzuna requires app_id and app_key (set in API import settings).");
  }
  const country = (opts.country || "in").toLowerCase();
  const page = 1;
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.set("app_id", opts.appId);
  url.searchParams.set("app_key", opts.appKey);
  url.searchParams.set("results_per_page", String(Math.min(opts.max, 50)));
  url.searchParams.set("content-type", "application/json");
  if (opts.query.trim()) url.searchParams.set("what", opts.query.trim());
  if (opts.location.trim()) url.searchParams.set("where", opts.location.trim());

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "ColdAuto/1.0 (job import)" },
  });
  if (!res.ok) throw new Error(`Adzuna API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    results?: Array<{
      id?: string;
      title?: string;
      company?: { display_name?: string };
      redirect_url?: string;
      description?: string;
      location?: { display_name?: string };
    }>;
  };

  return (data.results ?? []).map((j) => ({
    title: j.title || "Untitled",
    company: j.company?.display_name || "Unknown",
    url: j.redirect_url || null,
    description: stripHtml(j.description || ""),
    externalId: j.id ? String(j.id) : null,
    location: j.location?.display_name || null,
  }));
}

export async function runJobApiImport(trigger: "manual" | "worker" = "manual") {
  const settings = await getApiImportSettings();
  const run = await prisma.importRun.create({
    data: {
      kind: "job_api",
      status: "running",
      trigger,
      details: { provider: settings.provider, query: settings.query, location: settings.location },
    },
  });

  try {
    let jobs: NormalizedJob[] = [];
    if (settings.provider === "remotive") {
      jobs = await fetchRemotive(settings.query, settings.maxResults);
    } else {
      jobs = await fetchAdzuna({
        appId: settings.adzunaAppId,
        appKey: settings.adzunaAppKey,
        country: settings.adzunaCountry,
        query: settings.query,
        location: settings.location,
        max: settings.maxResults,
      });
    }

    const source = settings.provider === "adzuna" ? "api_adzuna" : "api_remotive";
    const pipeline = await processImportedJobs({
      jobs,
      source,
      importRunId: run.id,
      autoDraft: settings.autoDraft,
      minDraftScore: settings.minDraftScore,
    });

    const finished = await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: pipeline.errors > 0 && pipeline.imported === 0 ? "failed" : pipeline.errors > 0 ? "partial" : "success",
        finishedAt: new Date(),
        fetched: jobs.length,
        parsed: jobs.length,
        imported: pipeline.imported,
        duplicates: pipeline.duplicates,
        scored: pipeline.scored,
        contactsFound: pipeline.contactsFound,
        drafted: pipeline.drafted,
        errors: pipeline.errors,
        message: `Fetched ${jobs.length}, imported ${pipeline.imported}, duplicates ${pipeline.duplicates}`,
        details: {
          provider: settings.provider,
          jobIds: pipeline.jobIds.slice(0, 50),
          errorMessages: pipeline.errorMessages.slice(0, 20),
        },
      },
    });

    await logEvent({
      scope: "import",
      message: `API import (${settings.provider}) finished: ${finished.message}`,
    });

    return finished;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), errors: 1, message: msg },
    });
    await logEvent({ level: "error", scope: "import", message: `API import failed: ${msg}` });
    return prisma.importRun.findUnique({ where: { id: run.id } });
  }
}
