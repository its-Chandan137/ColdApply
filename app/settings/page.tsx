import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { autoSendEnabled, dailyCap, nextSendGateAt } from "@/lib/settings";
import { sentCountSince, startOfToday } from "@/lib/send";
import { toggleAutoSend } from "@/app/actions/settings";
import ActionForm from "@/components/ActionForm";

function masked(v: string | undefined): string {
  return v ? `set (${v.slice(0, 3)}…)` : "not set";
}

async function SettingsPanel() {
  await connection(); // "sent today" and the pacing gate are time-dependent
  const [auto, cap, sentToday, gate] = await Promise.all([
    autoSendEnabled(),
    dailyCap(),
    sentCountSince(startOfToday()),
    nextSendGateAt(),
  ]);

  const gateActive = gate && gate.getTime() > Date.now();

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Auto-send</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              When enabled, the worker sends <em>approved</em> emails on its
              own, respecting the daily cap, the 2-6 minute pacing gap and the
              10-day rule. When disabled (default), approved emails wait for a
              manual <strong>Send now</strong>.
            </p>
            <p
              className={`mt-2 text-sm font-medium ${auto ? "text-red-600" : "text-emerald-700"}`}
            >
              Currently: {auto ? "ENABLED" : "disabled"}
            </p>
          </div>
          <ActionForm
            action={toggleAutoSend}
            fields={[]}
            label={auto ? "Disable auto-send" : "Enable auto-send"}
            className={`rounded-md px-3 py-2 text-sm font-medium text-white ${
              auto
                ? "bg-red-600 hover:bg-red-500"
                : "bg-slate-900 hover:bg-slate-700"
            }`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Sending rules</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            Daily cap: <strong>{sentToday}/{cap}</strong> sent today (from{" "}
            <code className="text-xs">DAILY_SEND_CAP</code>).
          </li>
          <li>
            Pacing: random 2-6 minute gap between sends.
            {gateActive ? (
              <>
                {" "}
                Next send allowed at{" "}
                <strong>{gate!.toLocaleTimeString()}</strong>.
              </>
            ) : (
              " No active delay."
            )}
          </li>
          <li>Never send twice to the same email address within 10 days.</li>
          <li>Nothing is sent without approval.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Providers &amp; mail</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">GEMINI_API_KEY</dt>
            <dd>{masked(process.env.GEMINI_API_KEY)}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">GROQ_API_KEY</dt>
            <dd>{masked(process.env.GROQ_API_KEY)}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">GEMINI_MODEL</dt>
            <dd>{process.env.GEMINI_MODEL || "gemini-2.5-flash"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">GROQ_MODEL</dt>
            <dd>{process.env.GROQ_MODEL || "llama-3.1-8b-instant"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">EMBED_MODEL</dt>
            <dd>{process.env.EMBED_MODEL || "models/gemini-embedding-001"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <dt className="text-slate-500">GMAIL_USER</dt>
            <dd>{masked(process.env.GMAIL_USER)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Edit <code>.env</code> to change these, then restart the app and the
          worker.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Worker</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sending, reply polling (every 10 min) and follow-up drafting run in a
          separate process:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-100">
          npm run worker
        </pre>
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Safety rules live here. Defaults are the safe ones.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-sm text-slate-500">Loading settings…</p>}
      >
        <SettingsPanel />
      </Suspense>
    </div>
  );
}
