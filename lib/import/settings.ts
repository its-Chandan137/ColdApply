import { getSetting, setSetting } from "@/lib/settings";
import {
  DEFAULT_ALERT_SETTINGS,
  DEFAULT_API_SETTINGS,
  type AlertImportSettings,
  type ApiImportSettings,
} from "./types";

const ALERT_KEY = "import.alert.config";
const API_KEY = "import.api.config";

function parseBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function parseNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAlertImportSettings(): Promise<AlertImportSettings> {
  const raw = await getSetting(ALERT_KEY);
  if (!raw) return { ...DEFAULT_ALERT_SETTINGS };
  try {
    const p = JSON.parse(raw) as Partial<AlertImportSettings>;
    return {
      ...DEFAULT_ALERT_SETTINGS,
      ...p,
      enabled: parseBool(p.enabled, DEFAULT_ALERT_SETTINGS.enabled),
      lookbackDays: Math.max(1, Math.min(30, parseNum(p.lookbackDays, DEFAULT_ALERT_SETTINGS.lookbackDays))),
      maxEmails: Math.max(1, Math.min(100, parseNum(p.maxEmails, DEFAULT_ALERT_SETTINGS.maxEmails))),
      autoDraft: parseBool(p.autoDraft, DEFAULT_ALERT_SETTINGS.autoDraft),
      minDraftScore: Math.max(0, Math.min(100, parseNum(p.minDraftScore, DEFAULT_ALERT_SETTINGS.minDraftScore))),
    };
  } catch {
    return { ...DEFAULT_ALERT_SETTINGS };
  }
}

export async function saveAlertImportSettings(
  s: Partial<AlertImportSettings>,
): Promise<void> {
  const current = await getAlertImportSettings();
  const next: AlertImportSettings = {
    ...current,
    ...s,
    enabled: parseBool(s.enabled ?? current.enabled, current.enabled),
    lookbackDays: Math.max(1, Math.min(30, parseNum(s.lookbackDays ?? current.lookbackDays, current.lookbackDays))),
    maxEmails: Math.max(1, Math.min(100, parseNum(s.maxEmails ?? current.maxEmails, current.maxEmails))),
    autoDraft: parseBool(s.autoDraft ?? current.autoDraft, current.autoDraft),
    minDraftScore: Math.max(0, Math.min(100, parseNum(s.minDraftScore ?? current.minDraftScore, current.minDraftScore))),
  };
  await setSetting(ALERT_KEY, JSON.stringify(next));
}

export async function getApiImportSettings(): Promise<ApiImportSettings> {
  const raw = await getSetting(API_KEY);
  if (!raw) return { ...DEFAULT_API_SETTINGS };
  try {
    const p = JSON.parse(raw) as Partial<ApiImportSettings>;
    const provider = p.provider === "adzuna" ? "adzuna" : "remotive";
    return {
      ...DEFAULT_API_SETTINGS,
      ...p,
      provider,
      enabled: parseBool(p.enabled, DEFAULT_API_SETTINGS.enabled),
      maxResults: Math.max(1, Math.min(50, parseNum(p.maxResults, DEFAULT_API_SETTINGS.maxResults))),
      autoDraft: parseBool(p.autoDraft, DEFAULT_API_SETTINGS.autoDraft),
      minDraftScore: Math.max(0, Math.min(100, parseNum(p.minDraftScore, DEFAULT_API_SETTINGS.minDraftScore))),
    };
  } catch {
    return { ...DEFAULT_API_SETTINGS };
  }
}

export async function saveApiImportSettings(
  s: Partial<ApiImportSettings>,
): Promise<void> {
  const current = await getApiImportSettings();
  const provider = (s.provider ?? current.provider) === "adzuna" ? "adzuna" : "remotive";
  const next: ApiImportSettings = {
    ...current,
    ...s,
    provider,
    enabled: parseBool(s.enabled ?? current.enabled, current.enabled),
    maxResults: Math.max(1, Math.min(50, parseNum(s.maxResults ?? current.maxResults, current.maxResults))),
    autoDraft: parseBool(s.autoDraft ?? current.autoDraft, current.autoDraft),
    minDraftScore: Math.max(0, Math.min(100, parseNum(s.minDraftScore ?? current.minDraftScore, current.minDraftScore))),
  };
  await setSetting(API_KEY, JSON.stringify(next));
}
