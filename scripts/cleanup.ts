import { prisma } from "../lib/db";

async function main() {
  // Full reset for reliable e2e runs: wipe all seed data.
  await prisma.outreach.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.profileSection.deleteMany({});
  await prisma.profileChunk.deleteMany({});
  await prisma.appLog.deleteMany({});
  await prisma.setting.deleteMany({});

  console.log("cleanup done");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
