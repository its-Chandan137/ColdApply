import { prisma } from "../lib/db";

/**
 * Seed a job + contact + draft directly (bypassing the LLM) so UI flows can be
 * tested without API keys: npx tsx scripts/seed.ts
 */
async function main() {
  const existing = await prisma.job.findFirst({
    where: { company: "Northwind Labs" },
  });
  if (existing) {
    console.log("seed: already present, id =", existing.id);
    return;
  }

  const job = await prisma.job.create({
    data: {
      title: "Senior Backend Engineer",
      company: "Northwind Labs",
      url: "https://example.com/jobs/senior-backend",
      description: `We are hiring a Senior Backend Engineer to build reliable APIs in TypeScript and Node.js.

You will own services, work with PostgreSQL, and care about observability.
Apply by emailing careers@northwindlabs.example or reach out directly to
priya.sharma@northwindlabs.example.

Requirements: 5+ years backend experience, strong TypeScript, distributed systems.`,
      matchScore: 78,
      matchReasons: [
        "Profile shows 6 years of TypeScript/Node.js backend work",
        "Experience operating services with metrics and alerting",
        "Led API design for a payments platform",
      ],
      matchGaps: ["No PostgreSQL production ownership listed", "No mention of Kubernetes"],
    },
  });

  const contact = await prisma.contact.create({
    data: {
      jobId: job.id,
      email: "priya.sharma@northwindlabs.example",
      name: "Priya Sharma",
      source: "job_post",
      verified: true,
    },
  });

  const body = `Hi Priya,

I saw Northwind Labs is hiring a Senior Backend Engineer, and my six years building TypeScript services line up closely with what you need. At my last role I owned the payments API end to end, cutting p99 latency by 40 percent through query tuning and better caching, and I set up the metrics and alerting the team still uses daily.

The posting mentions a strong bias for observability and reliable services, which is exactly where I have spent most of the last three years.

Would you be open to a short call next week to see if there is a fit?

If this isn't relevant, reply "no thanks" and I won't follow up again.`;

  const outreach = await prisma.outreach.create({
    data: {
      jobId: job.id,
      contactId: contact.id,
      kind: "initial",
      subject: "Senior Backend Engineer - 6 yrs TypeScript APIs",
      body,
      status: "drafted",
    },
  });

  console.log("seeded:", { job: job.id, contact: contact.id, outreach: outreach.id });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
