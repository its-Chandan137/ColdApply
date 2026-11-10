import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ContactForm from "@/components/ContactForm";
import ActionForm from "@/components/ActionForm";
import { deleteContact, toggleVerified } from "@/app/actions/contacts";

async function ContactsSection() {
  const [contacts, jobs] = await Promise.all([
    prisma.contact.findMany({
      include: { job: { select: { id: true, title: true, company: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, company: true },
    }),
  ]);

  const jobOptions = jobs.map((j) => ({
    id: j.id,
    label: `${j.title} @ ${j.company}`,
  }));

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Add a job first</p>
        <p className="mt-1 text-sm text-slate-500">
          Contacts belong to jobs, so create one on the{" "}
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Jobs
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  return (
    <>
      <ContactForm jobs={jobOptions} />

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No contacts yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add one manually, or emails found in a job posting are extracted
            automatically when you save the job.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Job</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Verified</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${c.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/jobs/${c.jobId}`}
                      className="hover:underline"
                    >
                      {c.job.title}
                    </Link>
                    <span className="text-slate-500"> @ {c.job.company}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.source}
                  </td>
                  <td className="px-4 py-3">
                    <ActionForm
                      action={toggleVerified}
                      fields={[{ name: "id", value: c.id }]}
                      label={c.verified ? "✓ yes" : "no"}
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        c.verified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 text-slate-500 hover:bg-slate-50"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionForm
                      action={deleteContact}
                      fields={[{ name: "id", value: c.id }]}
                      label="Delete"
                      confirmText={`Delete ${c.email} and its outreach?`}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who each outreach goes to. Emails are also extracted from job
          descriptions automatically.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-sm text-slate-500">Loading contacts…</p>}
      >
        <ContactsSection />
      </Suspense>
    </div>
  );
}
