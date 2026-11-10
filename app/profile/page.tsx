import { Suspense } from "react";
import { prisma } from "@/lib/db";
import ProfileUpload from "@/components/ProfileUpload";
import SectionCard from "@/components/SectionCard";
import AddSectionForm from "@/components/AddSectionForm";

async function SectionsList() {
  const [sections, chunkCount] = await Promise.all([
    prisma.profileSection.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.profileChunk.count(),
  ]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        {sections.length > 0 ? (
          <span>
            {sections.length} section(s) &middot; {chunkCount} embedded chunk(s)
          </span>
        ) : (
          <span>0 section(s) &middot; 0 embedded chunk(s)</span>
        )}
        <AddSectionForm />
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No profile yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload a resume PDF above, or add sections manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <SectionCard
              key={s.id}
              id={s.id}
              type={s.type}
              title={s.title}
              content={s.content}
              updatedAt={s.updatedAt.toISOString()}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your facts, embedded for retrieval. Emails can only use what is stored
          here.
        </p>
      </div>

      <ProfileUpload />

      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Loading profile sections…</p>
        }
      >
        <SectionsList />
      </Suspense>
    </div>
  );
}
