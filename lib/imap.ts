import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ParsedMail } from "mailparser";
import { prisma } from "./db";
import { normalizeMessageId } from "./emails";
import { logEvent } from "./log";

export type PollResult = {
  replies: number;
  bounces: number;
  unmatched: number;
  errors: number;
};

const BOUNCE_SUBJECT =
  /undelivered|delivery status notification|returned to sender|delivery (failure|failed|problem)|mail delivery (failed|subsystem)|failure notice/i;

function imapClient() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set in .env");
  }
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

function firstAddress(addr: ParsedMail["to"]): string | null {
  if (!addr) return null;
  const single = Array.isArray(addr) ? addr[0] : addr;
  return single?.value?.[0]?.address ?? null;
}

function headerIds(parsed: ParsedMail): string[] {
  const ids: string[] = [];
  if (parsed.inReplyTo) ids.push(normalizeMessageId(parsed.inReplyTo));
  const refs = parsed.references;
  if (Array.isArray(refs)) ids.push(...refs.map(normalizeMessageId));
  else if (typeof refs === "string") {
    for (const r of refs.match(/<[^>]+>/g) ?? []) ids.push(normalizeMessageId(r));
  }
  return ids.filter(Boolean);
}

/** Find the sent outreach whose Message-ID appears in a reply's headers. */
async function matchByMessageIds(ids: string[]) {
  if (ids.length === 0) return null;
  const sent = await prisma.outreach.findMany({
    where: { messageId: { not: null } },
    orderBy: { sentAt: "desc" },
    take: 500,
    select: { id: true, messageId: true },
  });
  const map = new Map(sent.map((s) => [normalizeMessageId(s.messageId), s.id]));
  for (const id of ids) {
    const outreachId = map.get(id);
    if (outreachId) return outreachId;
  }
  return null;
}

/** Bounces: recover the original Message-ID or the recipient from the report. */
async function matchBounce(parsed: ParsedMail, raw: string): Promise<string | null> {
  const orig =
    raw.match(/Original-Message-ID:\s*<?([^\s>]+)>?/i)?.[1] ?? null;
  if (orig) {
    const byId = await matchByMessageIds([normalizeMessageId(orig)]);
    if (byId) return byId;
  }

  const recipient =
    raw.match(/(?:Final-Recipient|Recipient):\s*rfc822;\s*([^\s<]+@[^\s<>]+)/i)
      ?.[1] ??
    firstAddress(parsed.to) ??
    null;
  if (!recipient) return null;

  const recent = await prisma.outreach.findFirst({
    where: {
      contact: { email: recipient.toLowerCase() },
      status: { in: ["sent", "no_reply"] },
      sentAt: { not: null },
    },
    orderBy: { sentAt: "desc" },
    select: { id: true },
  });
  return recent?.id ?? null;
}

/**
 * Poll Gmail IMAP for unseen mail, match replies/bounces against stored
 * Message-IDs, and update outreach statuses. Unmatched mail is logged, never
 * silently dropped.
 */
export async function pollReplies(): Promise<PollResult> {
  const result: PollResult = { replies: 0, bounces: 0, unmatched: 0, errors: 0 };
  const client = imapClient();
  let lock: Awaited<ReturnType<typeof client.getMailboxLock>> | null = null;

  try {
    await client.connect();
    lock = await client.getMailboxLock("INBOX");

    const me = (process.env.GMAIL_USER ?? "").toLowerCase();

    for await (const msg of client.fetch(
      { seen: false },
      { uid: true, envelope: true, source: true, internalDate: true },
    )) {
      try {
        const source = msg.source;
        if (!source) continue;
        const parsed = await simpleParser(source);
        const from = parsed.from?.value?.[0]?.address?.toLowerCase() ?? "";
        if (from && from === me) continue; // our own mail

        const subject = parsed.subject ?? "";
        const isBounce =
          BOUNCE_SUBJECT.test(subject) ||
          BOUNCE_SUBJECT.test(from) ||
          /mailer-daemon|postmaster/i.test(from);

        if (isBounce) {
          const outreachId = await matchBounce(parsed, source.toString("utf8"));
          if (outreachId) {
            await prisma.outreach.update({
              where: { id: outreachId },
              data: { status: "bounced", lastError: `Bounced: ${subject}`.slice(0, 500) },
            });
            result.bounces++;
            await logEvent({
              scope: "replies",
              message: `bounce detected for outreach ${outreachId}`,
              detail: subject,
            });
          } else {
            result.unmatched++;
            await logEvent({
              level: "error",
              scope: "replies",
              message: "bounce could not be matched to any outreach",
              detail: subject,
            });
          }
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
          continue;
        }

        const outreachId = await matchByMessageIds(headerIds(parsed));
        const looksLikeReply =
          /^re:/i.test(subject) || headerIds(parsed).length > 0;
        if (outreachId) {
          await prisma.outreach.update({
            where: { id: outreachId },
            data: {
              status: "replied",
              repliedAt: parsed.date ?? new Date(),
              lastError: null,
            },
          });
          result.replies++;
          await logEvent({
            scope: "replies",
            message: `reply matched to outreach ${outreachId}`,
            detail: `from=${from} subject=${subject}`,
          });
        } else if (looksLikeReply) {
          result.unmatched++;
          await logEvent({
            scope: "replies",
            message: "inbound message had no matching Message-ID",
            detail: `from=${from} subject=${subject}`,
          });
        }
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
      } catch (e) {
        result.errors++;
        await logEvent({
          level: "error",
          scope: "replies",
          message: `failed processing inbound message: ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
      }
    }
  } catch (e) {
    result.errors++;
    await logEvent({
      level: "error",
      scope: "replies",
      message: `IMAP poll failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    if (lock) lock.release();
    try {
      await client.logout();
    } catch {
      /* already closed */
    }
  }
  return result;
}
