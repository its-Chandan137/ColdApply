import { prisma } from "./db";
import { embed } from "./llm";

export type RetrievedChunk = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
  text: string;
  score: number;
};

export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Top-k profile chunks by cosine similarity against the query text. */
export async function retrieveTopK(
  query: string,
  k = 6,
): Promise<RetrievedChunk[]> {
  const chunks = await prisma.profileChunk.findMany({
    include: { section: { select: { title: true, type: true } } },
  });
  if (chunks.length === 0) return [];

  let queryVec: number[];
  try {
    queryVec = await embed(query);
  } catch (e) {
    // Retrieval failure must not lose the caller's data; surface it.
    throw e;
  }

  const scored: RetrievedChunk[] = chunks.map((c) => {
    const vec = Array.isArray(c.embedding) ? (c.embedding as number[]) : [];
    return {
      id: c.id,
      sectionId: c.sectionId,
      sectionTitle: c.section.title,
      sectionType: c.section.type,
      text: c.text,
      score: cosine(queryVec, vec),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Render retrieved chunks as labeled facts for an LLM prompt. */
export function renderFacts(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no profile facts available)";
  return chunks
    .map(
      (c, i) =>
        `${i + 1}. [${c.sectionType}: ${c.sectionTitle}] ${c.text.replace(/\s+/g, " ")}`,
    )
    .join("\n");
}
