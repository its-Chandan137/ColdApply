import "dotenv/config";
import { prisma } from "../lib/db";
import { reembedSection } from "../lib/profile";

async function main() {
  const sections = await prisma.profileSection.findMany({ select: { id: true, title: true } });
  console.log(`Embedding ${sections.length} sections...`);
  for (const s of sections) {
    try {
      await reembedSection(s.id);
      console.log(`  ok: ${s.title}`);
    } catch (e) {
      console.error(`  fail: ${s.title}`, e instanceof Error ? e.message : e);
    }
  }
  const chunks = await prisma.profileChunk.count();
  console.log(`Done. Total chunks: ${chunks}`);
}

main().finally(() => prisma.$disconnect());
