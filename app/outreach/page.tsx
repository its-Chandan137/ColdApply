import { Suspense } from "react";
import { prisma } from "@/lib/db";
import OutreachCard from "@/components/OutreachCard";

async function OutreachLists() {
  const outreach = await prisma.outreach.findMany({
    where: { status: { in: ["drafted", "approved", "sent"] } },
    include: { contact: true, job: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const drafted = outreach.filter((o) => o.status === "drafted");
  const approved = outreach.filter((o) => o.status === "approved");
  const sent = outreach.filter((o) => o.status === "sent");

  const render = (items: typeof outreach, empty: string) =>
    items.length === 0 ? (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        {empty}
      </p>
    ) : (
      <div className="grid gap-4">
        {items.map((o) => (
          <OutreachCard
            key={o.id}
            id={o.id}
            kind={o.kind}
            status={o.status}
            subject={o.subject}
            body={o.body}
            contactEmail={o.contact.email}
            jobTitle={o.job.title}
            company={o.job.company}
            lastError={o.lastError}
          />
        ))}
      </div>
    );

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Needs approval{" "}
          <span className="font-normal text-slate-500">
            ({drafted.length})
          </span>
        </h2>
        {render(drafted, "No drafts waiting. Drafts appear here from job pages or as auto follow-ups.")}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Approved - queued to send{" "}
          <span className="font-normal text-slate-500">
            ({approved.length})
          </span>
        </h2>
        {render(approved, "Nothing approved yet.")}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Recently sent <span className="font-normal text-slate-500">({sent.length})</span>
        </h2>
        {render(sent, "Nothing sent yet.")}
      </section>
    </>
  );
}

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nothing is ever sent without approval. Edit, approve, and queue here.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-sm text-slate-500">Loading outreach…</p>}
      >
        <OutreachLists />
      </Suspense>
    </div>
  );
}
