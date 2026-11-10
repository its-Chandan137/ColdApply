import { prisma } from "../lib/db";

async function main() {
  // Remove e2e/seed rows, keep DB tidy between runs.
  const contacts = await prisma.contact.findMany({ where: { email: { endsWith: "@e2e-corp.example" } } });
  const contactIds = contacts.map((c) => c.id);
  await prisma.outreach.deleteMany({ where: { contactId: { in: contactIds } } });
  await prisma.contact.deleteMany({ where: { email: { endsWith: "@e2e-corp.example" } } });
  await prisma.job.deleteMany({ where: { company: "E2E Corp" } });

  console.log("cleanup done");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
