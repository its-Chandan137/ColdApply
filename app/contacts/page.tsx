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
      <div className="rounded-[22px] border border-dashed border-[#E5EAF0] bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F9F5] text-[#00BFA5]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-bold text-[#111827]">Add a job first</p>
        <p className="mt-1 text-xs text-[#8293AD]">
          Contacts belong to jobs, so create one on the{" "}
          <Link href="/jobs" className="font-semibold text-[#075B4E] hover:underline">
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
        <div className="rounded-[22px] border border-dashed border-[#E5EAF0] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#8293AD]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-bold text-[#111827]">No contacts yet</p>
          <p className="mt-1 text-xs text-[#8293AD]">
            Add one manually, or emails found in a job posting are extracted automatically when you save a job.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5EAF0] bg-[#FAFBFD] text-left text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
                <tr>
                  <th className="px-5 py-3.5">Contact Email</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Associated Job</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5">Verified</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {contacts.map((c) => (
                  <tr key={c.id} className="transition hover:bg-[#F8FAFC]">
                    <td className="px-5 py-4">
                      <a
                        href={`mailto:${c.email}`}
                        className="font-bold text-[#111827] transition hover:text-[#00BFA5] hover:underline"
                      >
                        {c.email}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-700">
                      {c.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <Link
                        href={`/jobs/${c.jobId}`}
                        className="font-semibold text-slate-800 hover:text-[#00BFA5] hover:underline"
                      >
                        {c.job.title}
                      </Link>
                      <span className="block text-[11px] text-[#8293AD]">
                        {c.job.company}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#8293AD]">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {c.source.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <ActionForm
                        action={toggleVerified}
                        fields={[{ name: "id", value: c.id }]}
                        label={c.verified ? "✓ verified" : "unverified"}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          c.verified
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ActionForm
                        action={deleteContact}
                        fields={[{ name: "id", value: c.id }]}
                        label="Delete"
                        confirmText={`Delete ${c.email} and its outreach records?`}
                        className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00BFA5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293AD]">
              Audience &amp; Recipients
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827]">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-[#8293AD]">
            Verified recipients for each outreach. Emails are also extracted from job postings automatically.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-64 w-full animate-pulse rounded-[22px] border border-[#E5EAF0] bg-white" />
        }
      >
        <ContactsSection />
      </Suspense>
    </div>
  );
}
