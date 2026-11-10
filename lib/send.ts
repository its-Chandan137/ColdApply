import nodemailer from "nodemailer";
import { prisma } from "./db";
import { normalizeMessageId } from "./emails";
import { logEvent } from "./log";
import {
  dailyCap,
  nextSendGateAt,
  setNextSendGateAt,
} from "./settings";

export type SendResult = { ok: true; messageId: string } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const TEN_DAYS_MS = 10 * DAY_MS;

/** Random pacing gap between sends: 2-6 minutes. */
function randomGateMs(): number {
  return (2 + Math.random() * 4) * 60 * 1000;
}

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function sentCountSince(since: Date): Promise<number> {
  return prisma.outreach.count({ where: { sentAt: { gte: since } } });
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD are not set in .env - cannot send mail.",
    );
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

/** All send rules. Returns an error string when sending must not happen. */
export async function checkSendRules(
  contactEmail: string,
  excludeOutreachId: string,
): Promise<string | null> {
  const cap = await dailyCap();
  const sentToday = await sentCountSince(startOfToday());
  if (sentToday >= cap) {
    return `Daily send cap reached (${sentToday}/${cap}). Resets at midnight.`;
  }

  const recent = await prisma.outreach.findFirst({
    where: {
      contact: { email: contactEmail },
      sentAt: { gte: new Date(Date.now() - TEN_DAYS_MS) },
      id: { not: excludeOutreachId },
    },
    select: { id: true, sentAt: true, subject: true },
  });
  if (recent) {
    const when = recent.sentAt?.toISOString().slice(0, 10) ?? "recently";
    return `Rule: never send twice to the same email within 10 days (last sent ${when}: "${recent.subject}").`;
  }

  const gate = await nextSendGateAt();
  if (gate && gate.getTime() > Date.now()) {
    return `Send pacing active: next send allowed at ${gate.toLocaleTimeString()}.`;
  }
  return null;
}

/**
 * Send one approved outreach. `bypassGate` is for explicit manual sends from
 * the UI (still subject to the daily cap and the 10-day rule).
 */
export async function sendOutreach(
  outreachId: string,
  opts: { bypassGate?: boolean } = {},
): Promise<SendResult> {
  try {
    const o = await prisma.outreach.findUnique({
      where: { id: outreachId },
      include: {
        contact: true,
        job: true,
        parent: true,
      },
    });
    if (!o) return { ok: false, error: "Outreach not found." };
    if (o.status === "sent")
      return { ok: false, error: "This email has already been sent." };
    if (o.status !== "approved")
      return {
        ok: false,
        error: `Outreach must be approved before sending (current status: ${o.status}).`,
      };

    const ruleError = await checkSendRules(o.contact.email, o.id);
    if (ruleError && !opts.bypassGate) return { ok: false, error: ruleError };
    if (ruleError && opts.bypassGate) {
      // Manual send may bypass the pacing gate, but never the cap or 10-day rule.
      const cap = await dailyCap();
      const sentToday = await sentCountSince(startOfToday());
      if (sentToday >= cap)
        return { ok: false, error: `Daily send cap reached (${sentToday}/${cap}).` };
      if (!ruleError.startsWith("Send pacing active"))
        return { ok: false, error: ruleError };
    }

    const transporter = getTransporter();
    const from = process.env.GMAIL_USER!;
    const parentMessageId = o.parent?.messageId
      ? normalizeMessageId(o.parent.messageId)
      : "";

    const info = await transporter.sendMail({
      from: `"Cold Outreach" <${from}>`,
      to: o.contact.email,
      subject: o.subject,
      text: o.body,
      ...(parentMessageId
        ? {
            inReplyTo: o.parent!.messageId!,
            references: o.parent!.messageId!,
          }
        : {}),
    });

    const now = new Date();
    await prisma.outreach.update({
      where: { id: o.id },
      data: {
        status: "sent",
        sentAt: now,
        messageId: info.messageId ?? null,
        lastError: null,
        ...(o.kind === "initial"
          ? { followUpDueAt: new Date(now.getTime() + 6 * DAY_MS) }
          : { followUpSentAt: now }),
      },
    });
    await setNextSendGateAt(new Date(Date.now() + randomGateMs()));

    await logEvent({
      scope: "send",
      message: `sent ${o.kind} email to ${o.contact.email} (${o.subject})`,
      detail: `messageId=${info.messageId}`,
    });
    return { ok: true, messageId: info.messageId ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logEvent({
      level: "error",
      scope: "send",
      message: `failed to send outreach ${outreachId}: ${message}`,
    });
    try {
      await prisma.outreach.update({
        where: { id: outreachId },
        data: { lastError: message.slice(0, 1000) },
      });
    } catch {
      /* row may not exist */
    }
    return { ok: false, error: message };
  }
}
