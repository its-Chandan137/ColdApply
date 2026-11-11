import { prisma } from "../lib/db";
import { chunkText } from "../lib/chunk";

function mockVector(seed: number, dims = 768): number[] {
  const vec: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dims; i++) {
    const val = Math.sin(seed * 997 + i * 31);
    vec.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

async function main() {
  console.log("Seeding database according to ColdAuto Job Search Architecture...");

  // 1. Clear existing test data
  await prisma.outreach.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.job.deleteMany();
  await prisma.profileChunk.deleteMany();
  await prisma.profileSection.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.appLog.deleteMany();

  // 2. Settings
  await prisma.setting.createMany({
    data: [
      { key: "dailySendCap", value: "20" },
      { key: "autoSend", value: "false" }, // safe default: human approval required
      {
        key: "nextSendGateAt",
        value: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
      },
    ],
  });

  // 3. Structured Profile (Resume Memory Store for RAG)
  const profileSections = [
    {
      type: "summary",
      title: "Professional Summary",
      content:
        "Full-Stack & Backend Engineer with 5+ years of experience building high-throughput TypeScript, Node.js, and Next.js applications. Strong track record in distributed microservices, database optimization with PostgreSQL and SQLite, and AI/LLM workflow automation. Passionate about developer tooling, reliability, and clean code architecture.",
    },
    {
      type: "skill",
      title: "Core Technologies & Stack",
      content:
        "Languages: TypeScript, JavaScript (ES6+), Python, SQL.\nFrameworks & Libraries: Node.js, Next.js (App Router), React 19, Express, FastAPI, Tailwind CSS.\nDatabases & Storage: PostgreSQL, SQLite, Prisma ORM, Redis, Supabase.\nDevOps & Tools: Docker, AWS (Lambda, S3, EC2), GitHub Actions, Git, Playwright.\nAI & Automation: LLM Orchestration (Gemini, Groq, OpenAI), Vector Embeddings & RAG, Puppeteer, IMAP/SMTP mail automation.",
    },
    {
      type: "experience",
      title: "Senior Backend Engineer @ Nexus Tech (2022 - Present)",
      content:
        "Architected distributed Node.js/TypeScript backend services processing 2.5M daily webhook requests. Designed multi-tier caching layers with Redis, reducing p99 response times from 340ms to 45ms. Spearheaded migration of monolithic APIs to modular microservices using Prisma and PostgreSQL. Implemented automated end-to-end integration test suites with Playwright, increasing code coverage to 92%.",
    },
    {
      type: "experience",
      title: "Software Engineer @ Scaleflow Systems (2020 - 2022)",
      content:
        "Owned transactional email and event notification pipeline delivering 500k+ emails monthly with 99.8% reliability. Built automated IMAP reply processing engine and delivery bounce handlers. Implemented token-bucket rate limiters and pacing gates to safeguard delivery reputation and eliminate spam false-positives.",
    },
    {
      type: "project",
      title: "ColdAuto - Autonomous Cold Outreach Engine",
      content:
        "Engineered an end-to-end intelligent job outreach pipeline using Next.js 16, Prisma/SQLite, and Gemini with Groq fallback. Implemented cosine similarity vector retrieval over candidate facts to write 100-120 word personalized emails with zero hallucination. Features Gmail IMAP polling for thread-aware reply tracking and 2-6 min pacing safety gates.",
    },
    {
      type: "project",
      title: "Distributed Event Stream Gateway",
      content:
        "Developed an open-source event dispatcher in TypeScript with worker thread pools, handling out-of-order delivery retries and dead-letter queues. Handled 10k concurrent WebSocket connections with sub-10ms delivery latencies.",
    },
    {
      type: "achievement",
      title: "Performance & Cost Achievements",
      content:
        "Reduced cloud infrastructure costs by 32% by optimizing PostgreSQL query execution plans, indexing strategies, and connection pooling. Maintained a 99.95% uptime SLA across core payment and notification services over 18 consecutive months.",
    },
  ];

  for (let sIdx = 0; sIdx < profileSections.length; sIdx++) {
    const s = profileSections[sIdx];
    const createdSec = await prisma.profileSection.create({
      data: {
        type: s.type,
        title: s.title,
        content: s.content,
      },
    });

    const chunks = chunkText(s.content, 400, 80);
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      await prisma.profileChunk.create({
        data: {
          sectionId: createdSec.id,
          text: chunks[cIdx],
          embedding: mockVector(sIdx * 10 + cIdx),
        },
      });
    }
  }

  // 4. Target Jobs
  const jobsData = [
    {
      title: "Senior Backend Engineer",
      company: "Stripe",
      url: "https://stripe.com/jobs/senior-backend-engineer",
      description:
        "We are looking for a Senior Backend Engineer to join our Core Infrastructure & Payments team. You will build high-reliability APIs, manage distributed transactions, and optimize database throughput across global payment flows. Requirements: 4+ years of TypeScript/Node.js or Go, deep understanding of SQL/PostgreSQL, distributed systems, and telemetry.",
      matchScore: 92,
      matchReasons: [
        "Strong 5+ years background building high-throughput TypeScript/Node.js microservices",
        "Direct experience with transactional payment workflows and p99 latency optimization",
        "Deep familiarity with PostgreSQL query tuning, caching, and Prisma ORM",
      ],
      matchGaps: ["Stripe uses Go and Ruby in parts of infra (easily transferable from Node/TS)"],
    },
    {
      title: "Full Stack Engineer (Platform)",
      company: "Vercel",
      url: "https://vercel.com/careers/full-stack-engineer",
      description:
        "Help us build the frontend cloud. We're looking for engineers passionate about Next.js App Router, React Server Components, Turbopack, and edge runtime services. Requirements: Strong TypeScript skills, mastery of React and modern web standards, experience with developer experience tooling.",
      matchScore: 89,
      matchReasons: [
        "Extensive practical production experience with Next.js App Router and React 19",
        "Expertise in modern TypeScript, full-stack architecture, and server components",
        "Built developer tools, CLI automation, and performance-driven applications",
      ],
      matchGaps: ["Experience with Vercel Edge Runtime and V8 isolates at scale"],
    },
    {
      title: "AI Platform Engineer",
      company: "Scale AI",
      url: "https://scale.com/careers/ai-platform",
      description:
        "Scale AI builds the data foundry for AI. We need an engineer to build autonomous agent infrastructure, vector retrieval pipelines, and model evaluation workflows. Requirements: Python/TypeScript, experience with LLM APIs (Gemini, OpenAI, Groq), vector embeddings, and RAG architectures.",
      matchScore: 86,
      matchReasons: [
        "Engineered RAG pipelines with vector similarity retrieval and fallback providers",
        "Deep hands-on experience orchestrating Gemini, Groq, and autonomous worker cron tasks",
        "Robust TypeScript and Python backend background",
      ],
      matchGaps: ["Distributed model fine-tuning experience"],
    },
    {
      title: "Backend Engineer (Sync Engine)",
      company: "Linear",
      url: "https://linear.app/careers/backend-sync",
      description:
        "Linear is known for its speed and craft. We are hiring a backend engineer to work on our real-time synchronization engine, client-side SQLite replication, and WebSocket streaming infrastructure. Requirements: TypeScript, Node.js, SQLite/PostgreSQL, obsession with performance and latency.",
      matchScore: 82,
      matchReasons: [
        "Strong focus on local-first SQLite architectures and low-latency APIs",
        "Built WebSocket event dispatchers handling thousands of concurrent connections",
        "Proven focus on craft, clean system abstractions, and developer experience",
      ],
      matchGaps: ["Custom conflict-free replicated data types (CRDTs) experience"],
    },
    {
      title: "Automation & Workflows Engineer",
      company: "Brex",
      url: "https://brex.com/careers/workflows-engineer",
      description:
        "Join Brex to automate corporate card workflows, expense management pipelines, and transactional email integrations. Looking for strong backend generalists with Node.js/TypeScript and financial integration experience.",
      matchScore: 78,
      matchReasons: [
        "Experience building transactional email infrastructure and webhook processors",
        "Implemented token-bucket pacing gates and rate limiters for third-party APIs",
        "Solid PostgreSQL and Node.js foundation",
      ],
      matchGaps: ["Experience with enterprise ERP accounting software integrations"],
    },
    {
      title: "Database Infrastructure Engineer",
      company: "Supabase",
      url: "https://supabase.com/careers/db-infra",
      description:
        "Supabase is the open source Firebase alternative. We're looking for an engineer to help scale our PostgreSQL infrastructure, connection pooling, and multi-tenant backup pipelines.",
      matchScore: 75,
      matchReasons: [
        "Demonstrated 32% cloud cost reduction through PostgreSQL query plan optimization",
        "Experience with connection pool tuning, indexing, and Prisma database schema design",
      ],
      matchGaps: ["PostgreSQL C extensions and internal engine development"],
    },
    {
      title: "Cloud Observability Engineer",
      company: "Datadog",
      url: "https://datadog.com/careers/observability",
      description:
        "We are seeking an engineer to build distributed tracing agents in Go and C++. Deep knowledge of eBPF and Linux kernel primitives required.",
      matchScore: 54, // Below 70 threshold
      matchReasons: ["Experience setting up metrics, alerting, and service observability"],
      matchGaps: [
        "Role requires deep Go/C++ and eBPF systems programming",
        "Candidate background is centered on TypeScript, Node.js, and web application architecture",
      ],
    },
  ];

  const createdJobs = [];
  for (const jd of jobsData) {
    const job = await prisma.job.create({
      data: {
        title: jd.title,
        company: jd.company,
        url: jd.url,
        description: jd.description,
        matchScore: jd.matchScore,
        matchReasons: jd.matchReasons,
        matchGaps: jd.matchGaps,
      },
    });
    createdJobs.push(job);
  }

  // 5. Contacts (Reflecting the 4 free sources from the plan)
  const contactsData = [
    {
      jobIndex: 0, // Stripe
      name: "Sarah Jenkins",
      email: "sarah.jenkins@stripe.com",
      source: "job_post", // extracted from post
      verified: true,
    },
    {
      jobIndex: 0, // Stripe
      name: "Marcus Cole",
      email: "mcole@stripe.com",
      source: "pattern_guess", // firstname.lastname pattern
      verified: true,
    },
    {
      jobIndex: 1, // Vercel
      name: "Alex Rivera",
      email: "alex@vercel.com",
      source: "job_post",
      verified: true,
    },
    {
      jobIndex: 1, // Vercel
      name: "Talent Acquisition",
      email: "talent@vercel.com",
      source: "careers_page",
      verified: false,
    },
    {
      jobIndex: 2, // Scale AI
      name: "Vikram Malhotra",
      email: "v.malhotra@scale.com",
      source: "pattern_guess",
      verified: true,
    },
    {
      jobIndex: 3, // Linear
      name: "Tuomas Artman",
      email: "tuomas@linear.app",
      source: "manual",
      verified: true,
    },
    {
      jobIndex: 4, // Brex
      name: "Careers Team",
      email: "careers@brex.com",
      source: "careers_page",
      verified: false,
    },
    {
      jobIndex: 5, // Supabase
      name: "Paul Copplestone",
      email: "paul@supabase.com",
      source: "manual",
      verified: true,
    },
    {
      jobIndex: 6, // Datadog
      name: "Recruiting Ops",
      email: "recruiting@datadoghq.com",
      source: "careers_page",
      verified: false,
    },
  ];

  const createdContacts = [];
  for (const cd of contactsData) {
    const contact = await prisma.contact.create({
      data: {
        jobId: createdJobs[cd.jobIndex].id,
        name: cd.name,
        email: cd.email,
        source: cd.source,
        verified: cd.verified,
      },
    });
    createdContacts.push(contact);
  }

  // 6. Outreach Pipeline Data (Full lifecycle matching the spec)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const outreachData = [
    // 1. Stripe - Interview Scheduled (Manual status moved by user!)
    {
      jobId: createdJobs[0].id,
      contactId: createdContacts[0].id,
      kind: "initial",
      subject: "Senior Backend Engineer - High-Throughput TypeScript APIs",
      body: `Hi Sarah,\n\nI saw Stripe is hiring for the Core Payments team, and my five years engineering high-throughput TypeScript backend services align directly with what you need. At Nexus Tech, I architected distributed microservices processing 2.5M daily webhook requests and tuned our PostgreSQL queries and Redis caching to drop p99 response times from 340ms to 45ms.\n\nI really admire Stripe's relentless commitment to API craft and developer reliability, and I'd love to contribute that same precision to your payment flows.\n\nWould you have 10 minutes next Tuesday for a brief introductory chat?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "interview",
      sentAt: new Date(now.getTime() - 5 * dayMs),
      repliedAt: new Date(now.getTime() - 4 * dayMs),
      followUpDueAt: null,
      notes: "Met with Sarah on Google Meet. Technical screen scheduled for Friday 2 PM.",
    },

    // 2. Linear - Replied via IMAP (Positive reply recorded)
    {
      jobId: createdJobs[3].id,
      contactId: createdContacts[5].id,
      kind: "initial",
      subject: "Backend Sync Engine - Local-First & Low Latency",
      body: `Hi Tuomas,\n\nI saw Linear is hiring a backend engineer for your synchronization engine. I have spent the last few years obsessed with low-latency TypeScript services and local-first SQLite architectures. Recently I engineered an event stream dispatcher that handled 10,000 concurrent WebSocket connections with sub-10ms delivery latencies.\n\nLinear's focus on speed, keyboard-first UX, and synchronizing client state without spinners is the gold standard in our industry.\n\nWould you be open to a quick call next week to see if my background matches your team's needs?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "replied",
      sentAt: new Date(now.getTime() - 3 * dayMs),
      repliedAt: new Date(now.getTime() - 1 * dayMs),
      followUpDueAt: null,
      notes: "Tuomas replied: 'Love the event gateway project. Let's set up a 15 min call.'",
    },

    // 3. Supabase - Replied via IMAP
    {
      jobId: createdJobs[5].id,
      contactId: createdContacts[7].id,
      kind: "initial",
      subject: "PostgreSQL & Database Infra - 32% Query Optimization",
      body: `Hi Paul,\n\nI've been following Supabase's rapid growth and saw your team is expanding database infrastructure. In my previous role, I led our PostgreSQL optimization initiative, tuning connection pool allocations and query plans to reduce infrastructure spend by 32% while keeping 99.95% uptime over 18 months.\n\nYour vision of making high-performance Postgres accessible to every developer resonates deeply with my engineering values.\n\nWould you have 10 minutes next week to connect?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "replied",
      sentAt: new Date(now.getTime() - 4 * dayMs),
      repliedAt: new Date(now.getTime() - 2 * dayMs),
      followUpDueAt: null,
      notes: "Forwarded to hiring manager for infra screening.",
    },

    // 4. Vercel - Sent today (within daily cap)
    {
      jobId: createdJobs[1].id,
      contactId: createdContacts[2].id,
      kind: "initial",
      subject: "Full Stack Platform - Next.js App Router & DX",
      body: `Hi Alex,\n\nI noticed Vercel is looking for a Full Stack Platform Engineer. I have spent the past two years building deeply on Next.js 16 App Router, React Server Components, and modular microservices. At Nexus Tech, I migrated our core web apps to server components and reduced bundle sizes by 40% while authoring custom automation tools for our engineering team.\n\nI love Vercel's mission to make the web faster and would bring immediate value to the developer platform team.\n\nWould you be open to connecting for a short chat next week?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "sent",
      sentAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      followUpDueAt: new Date(now.getTime() + 6 * dayMs), // follow-up in 6 days
      notes: "Sent via Gmail SMTP. Message-ID recorded.",
    },

    // 5. Brex - Sent today (within daily cap)
    {
      jobId: createdJobs[4].id,
      contactId: createdContacts[6].id,
      kind: "initial",
      subject: "Workflows Engineer - Transactional Systems & Integrations",
      body: `Hi Careers Team,\n\nI saw Brex is expanding its Workflows and Automations team. In my background at Scaleflow, I owned our transactional email and webhook infrastructure delivering 500k+ messages monthly, designing token-bucket pacing gates and rate-limiters to ensure 99.8% delivery reliability.\n\nI would love to help Brex build high-reliability financial workflows and automation pipelines.\n\nCould we arrange a brief 10-minute introductory call?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "sent",
      sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      followUpDueAt: new Date(now.getTime() + 6 * dayMs),
      notes: "Pacing gate respected: 4m delay applied before send.",
    },

    // 6. Follow-up Due Right Now (Sent 6 days ago with no reply)
    {
      jobId: createdJobs[0].id,
      contactId: createdContacts[1].id, // Marcus Cole
      kind: "initial",
      subject: "Core Payments Infrastructure - TypeScript Services",
      body: `Hi Marcus,\n\nI saw Stripe is growing its Payments Infrastructure team. Having spent five years architecting TypeScript microservices and optimizing PostgreSQL query plans for 2.5M daily transactions, I know the precision required to keep payment pipelines rock solid.\n\nI'd love to learn more about the team's roadmap and share how my backend experience can help accelerate your milestones.\n\nWould you have 10 minutes for a brief call next week?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "sent",
      sentAt: new Date(now.getTime() - 6 * dayMs - 2 * 60 * 60 * 1000),
      followUpDueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // due 2 hours ago!
      notes: "6 days passed without reply. Ready for follow-up draft.",
    },

    // 7. Follow-up Draft Awaiting Review
    {
      jobId: createdJobs[4].id,
      contactId: createdContacts[6].id,
      kind: "followup",
      subject: "Re: Workflows Engineer - Transactional Systems & Integrations",
      body: `Hi Careers Team,\n\nFollowing up briefly on my note regarding the Workflows Engineer position at Brex. In addition to our transactional webhook pipelines, I recently open-sourced an autonomous event stream dispatcher handling out-of-order retries and dead-letter queues.\n\nI'd welcome the chance to speak if you are still screening candidates.\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "drafted",
      notes: "Auto-generated by worker cron. Awaiting human approval before queuing.",
    },

    // 8. Scale AI - Drafted (Awaiting Approval)
    {
      jobId: createdJobs[2].id,
      contactId: createdContacts[4].id,
      kind: "initial",
      subject: "AI Platform Engineer - RAG Retrieval & LLM Workflows",
      body: `Hi Vikram,\n\nI saw Scale AI is hiring for the AI Platform team. I have hands-on experience building autonomous RAG pipelines with vector embeddings and multi-provider failover (Gemini and Groq). I recently designed an outreach engine that performs cosine similarity retrieval over embedded facts with zero hallucinated claims.\n\nScale's mission to power the next generation of foundational AI applications aligns directly with my engineering focus.\n\nWould you be open to a 10-minute conversation this week?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "drafted",
      notes: "Tailored draft created by Gemini 2.0 Flash. Review required.",
    },

    // 9. Vercel - Drafted (Awaiting Approval)
    {
      jobId: createdJobs[1].id,
      contactId: createdContacts[3].id,
      kind: "initial",
      subject: "Full Stack Engineer - Next.js & Server Components",
      body: `Hi Talent Team,\n\nI saw your posting for a Full Stack Engineer on the Vercel Platform team. I have extensive experience building scalable web architectures with Next.js 16, React 19 Server Components, and Tailwind CSS. At Nexus Tech, I owned our internal tooling and reduced page load times by 40% through server component streaming.\n\nI'd love to bring my enthusiasm for developer experience to Vercel's platform.\n\nCould we set up a brief introductory call next week?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "drafted",
      notes: "Matched against retrieved profile facts.",
    },

    // 10. Approved - Queued to send by worker
    {
      jobId: createdJobs[3].id,
      contactId: createdContacts[5].id,
      kind: "initial",
      subject: "Linear Sync Engine - Low Latency WebSocket Pipelines",
      body: `Hi Tuomas,\n\nI noticed Linear's search for an engineer dedicated to your synchronization engine. My background centers on TypeScript, local-first SQLite architectures, and real-time event distribution. I've built WebSocket event dispatchers handling 10,000 concurrent connections with sub-10ms delivery latencies.\n\nLinear's bar for execution and craft is unparalleled, and I'd love to help push that forward.\n\nWould you have 10 minutes next week for an introductory conversation?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "approved",
      notes: "Approved by Vedhas. Queued for worker with 2-6 min delay.",
    },

    // 11. Bounced - Mailer Daemon delivery failure
    {
      jobId: createdJobs[6].id,
      contactId: createdContacts[8].id,
      kind: "initial",
      subject: "Observability Engineer - Distributed Telemetry",
      body: `Hi Recruiting Ops,\n\nI am reaching out regarding the Observability Engineer opening at Datadog. I have hands-on experience instrumenting distributed microservices with metrics, alerting, and distributed tracing across Node.js and cloud infrastructure.\n\nWould you be open to an introductory call?\n\nIf this isn't relevant, reply "no thanks" and I won't follow up again.`,
      status: "bounced",
      sentAt: new Date(now.getTime() - 2 * dayMs),
      lastError: "550 5.1.1 User unknown: recruiting@datadoghq.com mailbox not found",
      notes: "IMAP bounce detector flagged 550 Mailbox Not Found from mailer-daemon.",
    },
  ];

  for (const od of outreachData) {
    await prisma.outreach.create({
      data: {
        jobId: od.jobId,
        contactId: od.contactId,
        kind: od.kind,
        subject: od.subject,
        body: od.body,
        status: od.status,
        sentAt: od.sentAt ?? null,
        repliedAt: od.repliedAt ?? null,
        followUpDueAt: od.followUpDueAt ?? null,
        notes: od.notes ?? null,
        lastError: od.lastError ?? null,
      },
    });
  }

  // 7. System Activity Logs
  const logs = [
    {
      level: "info",
      scope: "llm",
      message: "Generated tailored cold email draft for Senior Backend Engineer @ Stripe via gemini-2.0-flash",
      detail: "Prompt tokens: 1,420 | Output tokens: 182 | Latency: 1.14s | Cosine top-k facts retrieved: 6",
    },
    {
      level: "info",
      scope: "replies",
      message: "IMAP thread sync: detected positive reply from Sarah Jenkins (Stripe)",
      detail: "In-Reply-To header matched Message-ID: <coldauto-stripe-001@gmail.com>. Status moved to replied.",
    },
    {
      level: "info",
      scope: "send",
      message: "Pacing gate active: send delay enforced (3 min 42 sec random gap)",
      detail: "Next send window: " + new Date(Date.now() + 4 * 60 * 1000).toLocaleTimeString(),
    },
    {
      level: "info",
      scope: "replies",
      message: "IMAP bounce detector: 550 Mailbox Not Found received for recruiting@datadoghq.com",
      detail: "Diagnostic code: smtp; 550 5.1.1 <recruiting@datadoghq.com>: Recipient address rejected",
    },
  ];

  for (const log of logs) {
    await prisma.appLog.create({
      data: {
        level: log.level,
        scope: log.scope,
        message: log.message,
        detail: log.detail,
      },
    });
  }

  console.log("Seeding complete! Successfully populated:");
  console.log(`- ${profileSections.length} Profile Sections with vector chunks`);
  console.log(`- ${createdJobs.length} Target Jobs with match scores & reasons`);
  console.log(`- ${createdContacts.length} Contacts from 4 different free sources`);
  console.log(`- ${outreachData.length} Outreach emails across all pipeline lifecycle stages`);
  console.log(`- Operational logs, safety settings & pacing gates`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
