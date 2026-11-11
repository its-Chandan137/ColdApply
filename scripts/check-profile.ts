import { prisma } from "../lib/db";

async function main() {
  const sections = await prisma.profileSection.count();
  const chunks = await prisma.profileChunk.count();
  console.log(JSON.stringify({ sections, chunks }, null, 2));
  const sample = await prisma.profileChunk.findFirst({ select: { text: true, embedding: true } });
  if (sample) console.log("sample chunk text:", sample.text.slice(0, 80));
}

main().finally(() => prisma.$disconnect());
