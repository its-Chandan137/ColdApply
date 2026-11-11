import { prisma } from "../lib/db";

async function main() {
  // Clear existing data
  await prisma.outreach.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.job.deleteMany();
  await prisma.profileChunk.deleteMany();
  await prisma.profileSection.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.appLog.deleteMany();

  // 1. Profile Sections extracted from resume
  const profileSections = [
    {
      type: "summary",
      title: "Summary",
      content:
        "Full Stack Developer with nearly 3 years of experience building production web applications across healthcare, government, construction, and SaaS. Skilled in React, Next.js, TypeScript, Angular, NgRx, Node.js, PostgreSQL, and Prisma, with hands-on experience in real-time systems (Socket.IO, SSE, LiveKit) and AI integration (OpenAI API, RAG).",
    },
    {
      type: "skill",
      title: "Skills",
      content:
        "Languages: JavaScript (ES6+), TypeScript, HTML5, CSS3, SQL\nFrontend: React, Next.js 14, Angular, Redux Toolkit, NgRx, RxJS, Tailwind CSS, SCSS, Bootstrap\nBackend and Data: Node.js, REST APIs, PostgreSQL, Prisma ORM\nReal-Time and AI: Socket.IO, WebSocket, Server-Sent Events (SSE), LiveKit, OpenAI API, RAG\nTools and Integrations: Git, Vite, Google APIs, Razorpay",
    },
    {
      type: "experience",
      title: "Experience",
      content:
        "Frontend Developer, Vedhas Technology Solutions | Dec 2023 – Present\n• Built an embeddable chat and voice widget that uses RAG over business knowledge to answer visitor questions and convert conversations into CRM leads.\n• Engineered low-latency voice streaming with LiveKit and OpenAI TTS over SSE, including speech-to-text normalization for spoken emails and phone numbers.\n• Designed a conversation-scoped, idempotent lead model that prevents duplicate leads, with calls and leads visible in a dashboard.\n\nLeadPilot AI (AI Voice and Chat Lead-Generation Platform, Vedhas project) | Next.js 14, TypeScript, Node.js, PostgreSQL, Prisma, LiveKit, OpenAI API, SSE\n• Built an embeddable chat and voice widget that uses RAG over business knowledge to answer visitor questions and convert conversations into CRM leads.\n• Engineered low-latency voice streaming with LiveKit and OpenAI TTS over SSE, including speech-to-text normalization for spoken emails and phone numbers.\n• Designed a conversation-scoped, idempotent lead model that prevents duplicate leads, with calls and leads visible in a dashboard.\n\nRTA e-NOC System (Dubai Government Infrastructure Clearance Portal) | Angular, NgRx\n• Owned Angular and NgRx store architecture, API integration, and backend data synchronization for a Dubai government NOC application used for infrastructure projects.\n• Kept the frontend running independently for 4+ months after a team reduction, resolving issues and owning most frontend work.\n\nFretBox / InternBox (Hostel Management SaaS) | React, Socket.IO, Redux, SCSS\n• Built a real-time chat system from scratch with Socket.IO, covering the frontend and backend, file uploads, online/offline status, read receipts, and student-to-management request flows.\n• Identified and fixed numerous pre-existing platform bugs alongside feature development.\n\nThrivent / Rightwise Prep (US Ed-Tech Portal) | React, Vite, SCSS\n• Built a design system covering colors, typography, forms, modals, dashboards, and sidebars, and implemented all frontend pages, including authentication flows.\n• Co-led frontend development with a senior lead and worked alongside a junior intern.\n\nSmart Health Assist (Healthcare Platform) | React, REST APIs\n• Built most UI pages, including appointment booking, medicine purchase, patient status monitoring, partner and nurse data entry, and per-patient report storage.\n\nAmplify Infra (Construction Management App) | React, Redux, Google APIs\n• Built GPS-based attendance, travel allowance tracking, and floor-wise portion planning features.\n• Architected complex multi-role dynamic forms across a legacy codebase.",
    },
    {
      type: "project",
      title: "Projects",
      content:
        "Vedhas Technology Solutions (Dec 2023 – Present): Chat and voice widget with RAG integration, low-latency voice streaming platform.\nLeadPilot AI: AI voice and chat lead-generation platform with RAG over business knowledge.\nRTA e-NOC System: Dubai government NOC application portal with Angular frontend.\nFretBox / InternBox: Hostel management SaaS with real-time chat, file uploads, online/offline status.\nSmart Health Assist: Healthcare platform with appointment booking, medicine purchase, patient monitoring.\nAmplify Infra: Construction management app with GPS attendance and travel allowance tracking.",
    },
    {
      type: "achievement",
      title: "Achievements",
      content:
        "• Kept frontend running independently for 4+ months after team reduction at RTA e-NOC System\n• Built embeddable chat and voice widget with RAG integration from scratch\n• Engineered low-latency voice streaming system with LiveKit and OpenAI TTS\n• Designed idempotent lead model preventing duplicate leads across 3 platforms\n• Created design system covering colors, typography, forms, modals, dashboards for US ed-tech portal",
    },
  ];

  for (const s of profileSections) {
    await prisma.profileSection.create({
      data: {
        type: s.type,
        title: s.title,
        content: s.content,
      },
    });
  }

  // 2. Settings
  await prisma.setting.createMany({
    data: [
      { key: "dailySendCap", value: "20" },
      { key: "autoSend", value: "false" },
      {
        key: "nextSendGateAt",
        value: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
      },
    ],
  });

  // 3. Sample jobs (you can add more later)
  const sampleJobs = [
    {
      title: "Frontend Developer",
      company: "Vedhas Technology Solutions",
      url: "https://www.linkedin.com/jobs/view/frontend-developer-at-vedhas-technology-solutions",
      description:
        "We are looking for a Frontend Developer with 2-4 years of React experience. Must know TypeScript, Tailwind CSS, and have built production web apps. Real-time chat experience is a plus.",
    },
    {
      title: "Full Stack Developer",
      company: "LeadPilot AI",
      url: "https://www.linkedin.com/jobs/view/full-stack-developer-at-leadpilot-ai",
      description:
        "Looking for a Full Stack Developer with Node.js, PostgreSQL, and Next.js experience. AI/ML integration experience preferred. Must be comfortable with OpenAI API and RAG patterns.",
    },
    {
      title: "React Developer",
      company: "Healthcare Startup",
      url: "https://www.linkedin.com/jobs/react-developer-startup",
      description:
        "React Developer needed for healthcare platform. Experience with REST APIs, patient data handling, and appointment systems. TypeScript a plus.",
    },
  ];

  for (const j of sampleJobs) {
    const job = await prisma.job.create({
      data: {
        title: j.title,
        company: j.company,
        url: j.url,
        description: j.description,
      },
    });

    // 3. Extract emails from job description (simple pattern guess)
    const emailPattern =
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = j.description.match(emailPattern) || [];
    const uniqueEmails = [...new Set(emails)];

    if (uniqueEmails.length > 0) {
      await prisma.contact.createMany({
        data: uniqueEmails.map((email) => ({
          jobId: job.id,
          email,
          name: null,
          source: "job_post",
          verified: false,
        })),
      });
    }
  }

  console.log("Seed complete");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });