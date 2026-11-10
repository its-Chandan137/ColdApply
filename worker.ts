import "dotenv/config";
import cron from "node-cron";
import { prisma } from "./lib/db";
import { autoSendEnabled, dailyCap, nextSendGateAt } from "./lib/settings";
import { sendOutreach, sentCountSince, startOfToday } from "./lib/send";
import { pollReplies } from "./lib/imap";
import { generateDraft } from "./lib/draft";
import { logEvent } from "./lib/log";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Send at most one approved email per tick; pacing gate spaces sends 2-6 min. */
async function tickSend(): Promise<void> {
  try {
    if (!(await autoSendEnabled())) return; // auto-send is opt-in (Settings)

    const gate = await nextSendGateAt();
    if (gate && gate.getTime() > Date.now()) return;

    const cap = await dailyCap();
    const sentToday = await sentCountSince(startOfToday());
    if (sentToday >= cap) return;

    const next = await prisma.outreach.findFirst({
      where: { status: "approved" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!next) return;

    const result = await sendOutreach(next.id);
    if (!result.ok) {
      // sendOutreach already logged it; also surface on the dashboard.
      await logEvent({
        level: "error",
        scope: "worker",
        message: `approved outreach ${next.id} could not be sent: ${result.error}`,
      });
      // Permanent rules (cap/10-day) shouldn't retry every minute; transient
      // failures (SMTP/network) retry soon.
      const permanent = /^(Rule:|Daily send cap)/.test(result.error);
      const { setNextSendGateAt } = await import("./lib/settings");
      await setNextSendGateAt(
        new Date(Date.now() + (permanent ? 60 : 5) * 60 * 1000),
      );
    }
  } catch (e) {
    await logEvent({
      level: "error",
      scope: "worker",
      message: `send tick failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/** Draft (never send) follow-ups once followUpDueAt has passed. */
async function tickFollowUps(): Promise<void> {
  try {
    const due = await prisma.outreach.findMany({
      where: {
        kind: "initial",
        status: { in: ["sent", "no_reply"] },
        followUpDueAt: { not: null, lte: new Date() },
        followups: { none: {} },
      },
      include: { job: true, contact: true },
      take: 5,
      orderBy: { followUpDueAt: "asc" },
    });

    for (const o of due) {
      try {
        const draft = await generateDraft({
          job: o.job,
          contact: o.contact,
          mode: "followup",
          previous: { subject: o.subject, body: o.body },
        });
        await prisma.outreach.create({
          data: {
            jobId: o.jobId,
            contactId: o.contactId,
            kind: "followup",
            parentOutreachId: o.id,
            subject: draft.subject,
            body: draft.body,
            status: "drafted",
            notes: "Auto-drafted follow-up - needs approval.",
          },
        });
        if (o.status === "sent") {
          await prisma.outreach.update({
            where: { id: o.id },
            data: { status: "no_reply" },
          });
        }
        await logEvent({
          scope: "draft",
          message: `follow-up drafted for ${o.contact.email} (needs approval)`,
        });
      } catch (e) {
        await logEvent({
          level: "error",
          scope: "draft",
          message: `follow-up draft failed for outreach ${o.id}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
      }
    }
  } catch (e) {
    await logEvent({
      level: "error",
      scope: "worker",
      message: `follow-up tick failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

async function tickReplies(): Promise<void> {
  try {
    const r = await pollReplies();
    if (r.replies || r.bounces || r.unmatched || r.errors) {
      console.log(
        `[worker] replies=${r.replies} bounces=${r.bounces} unmatched=${r.unmatched} errors=${r.errors}`,
      );
    }
  } catch (e) {
    await logEvent({
      level: "error",
      scope: "worker",
      message: `reply poll failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

async function main() {
  console.log("[worker] starting cold-outreach worker");
  await logEvent({
    scope: "worker",
    message: `worker started (autoSend=${await autoSendEnabled()}, cap=${await dailyCap()}, sentToday=${await sentCountSince(startOfToday())})`,
  });

  cron.schedule("* * * * *", () => void tickSend());
  cron.schedule("*/10 * * * *", () => void tickReplies());
  cron.schedule("*/15 * * * *", () => void tickFollowUps());

  // Run once shortly after boot so a restart doesn't stall the pipeline.
  setTimeout(() => void tickSend(), 3_000);
  setTimeout(() => void tickFollowUps(), 8_000);
  setTimeout(() => void tickReplies(), 15_000);

  console.log(
    "[worker] cron scheduled: send every 1m, replies every 10m, follow-ups every 15m",
  );
}

void main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});

// Keep a reference so DAY_MS stays intentional if extended later.
void DAY_MS;
