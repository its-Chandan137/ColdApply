import { prisma } from "./db";

export type LogScope =
  | "llm"
  | "send"
  | "replies"
  | "profile"
  | "jobs"
  | "contacts"
  | "draft"
  | "worker"
  | "ui";

/**
 * Persist an event so the UI can show it (errors are never swallowed).
 * Never throws: logging must not break the caller.
 */
export async function logEvent(opts: {
  level?: "info" | "error";
  scope: LogScope;
  message: string;
  detail?: string;
}): Promise<void> {
  const level = opts.level ?? "info";
  const line = `[${opts.scope}] ${level}: ${opts.message}`;
  if (level === "error") console.error(line, opts.detail ?? "");
  else console.log(line);

  try {
    await prisma.appLog.create({
      data: {
        level,
        scope: opts.scope,
        message: opts.message,
        detail: opts.detail ? String(opts.detail).slice(0, 8000) : null,
      },
    });
    // keep the table small
    const excess = await prisma.appLog.count();
    if (excess > 300) {
      const old = await prisma.appLog.findMany({
        orderBy: { createdAt: "asc" },
        take: excess - 300,
        select: { id: true },
      });
      await prisma.appLog.deleteMany({
        where: { id: { in: old.map((o) => o.id) } },
      });
    }
  } catch (e) {
    console.error("[log] failed to persist log entry", e);
  }
}
