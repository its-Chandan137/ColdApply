import { prisma } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Worker must not auto-send unless explicitly enabled in Settings. */
export async function autoSendEnabled(): Promise<boolean> {
  return (await getSetting("autoSend")) === "true";
}

export async function dailyCap(): Promise<number> {
  const fromEnv = Number(process.env.DAILY_SEND_CAP || "20");
  const override = await getSetting("dailySendCap");
  const n = override !== null ? Number(override) : fromEnv;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

/** Timestamp before which the next send must not happen (2-6 min pacing). */
export async function nextSendGateAt(): Promise<Date | null> {
  const v = await getSetting("nextSendGateAt");
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function setNextSendGateAt(date: Date): Promise<void> {
  await setSetting("nextSendGateAt", date.toISOString());
}
