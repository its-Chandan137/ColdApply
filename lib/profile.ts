import { prisma } from "./db";
import { chunkText } from "./chunk";
import { embedMany } from "./llm";
import { generateJSON } from "./llm";
import { logEvent } from "./log";

export type ResumeSection = {
  type: string;
  title: string;
  content: string;
};

/** Ask the LLM to turn resume text into structured, faithful sections. */
export async function extractResumeSections(
  resumeText: string,
): Promise<ResumeSection[]> {
  const prompt = `Extract a professional profile from the resume below as JSON.

Return exactly: {"sections":[{"type":"summary|skill|experience|project|achievement|other","title":"...","content":"..."}]}

Rules:
- Use ONLY text that appears in the resume. Never invent, embellish, or infer.
- type must be one of: summary, skill, experience, project, achievement, other.
- Group related bullets: one entry per job/degree/project, skills as one or a few grouped entries.
- Keep the original wording as much as possible.
- 3 to 14 sections.

RESUME TEXT:
${resumeText.slice(0, 24000)}`;

  const parsed = await generateJSON<{ sections?: ResumeSection[] }>(prompt);
  const sections = (parsed.sections ?? []).filter(
    (s) => s && typeof s.title === "string" && typeof s.content === "string" && s.content.trim(),
  );
  if (sections.length === 0) {
    throw new Error("The LLM returned no usable sections from this resume.");
  }
  return sections;
}

/** Replace a section's chunks with freshly embedded ones. */
export async function reembedSection(sectionId: string): Promise<void> {
  const section = await prisma.profileSection.findUnique({
    where: { id: sectionId },
  });
  if (!section) return;

  await prisma.profileChunk.deleteMany({ where: { sectionId } });
  const chunks = chunkText(section.content);
  if (chunks.length === 0) return;

  const vectors = await embedMany(chunks);
  await prisma.profileChunk.createMany({
    data: chunks.map((text, i) => ({ sectionId, text, embedding: vectors[i] })),
  });
  console.log(`[profile] embedded ${chunks.length} chunks for ${section.title}`);
}

/** Create sections (after a resume upload) and embed them. */
export async function createSectionsEmbedded(
  sections: ResumeSection[],
): Promise<{ embedded: number }> {
  let embedded = 0;
  for (const s of sections) {
    const created = await prisma.profileSection.create({
      data: {
        type: s.type || "other",
        title: s.title.trim().slice(0, 200),
        content: s.content.trim(),
      },
    });
    try {
      await reembedSection(created.id);
      embedded++;
    } catch (e) {
      await logEvent({
        level: "error",
        scope: "profile",
        message: `embedding failed for section "${created.title}"`,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { embedded };
}
