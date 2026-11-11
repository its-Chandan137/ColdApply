export type AlertImportSettings = {
  enabled: boolean;
  senders: string; // comma/newline separated sender emails/domains to match
  subjectKeywords: string; // comma/newline separated, any match
  mailbox: string; // e.g. INBOX
  lookbackDays: number;
  maxEmails: number;
  autoDraft: boolean; // auto-create draft when score>=70 and contact exists
  minDraftScore: number;
};

export type ApiImportSettings = {
  enabled: boolean;
  provider: "remotive" | "adzuna";
  query: string;
  location: string;
  adzunaAppId: string;
  adzunaAppKey: string;
  adzunaCountry: string; // e.g. in, gb, us
  maxResults: number;
  autoDraft: boolean;
  minDraftScore: number;
};

export const DEFAULT_ALERT_SETTINGS: AlertImportSettings = {
  enabled: false,
  senders: "jobs-noreply@linkedin.com\nnaukri@naukri.com\ninfo@naukri.com",
  subjectKeywords: "jobs, job alert, recommended, new jobs, openings",
  mailbox: "INBOX",
  lookbackDays: 7,
  maxEmails: 25,
  autoDraft: true,
  minDraftScore: 70,
};

export const DEFAULT_API_SETTINGS: ApiImportSettings = {
  enabled: false,
  provider: "remotive",
  query: "frontend react typescript",
  location: "",
  adzunaAppId: "",
  adzunaAppKey: "",
  adzunaCountry: "in",
  maxResults: 20,
  autoDraft: true,
  minDraftScore: 70,
};

export type NormalizedJob = {
  title: string;
  company: string;
  url?: string | null;
  description: string;
  externalId?: string | null;
  location?: string | null;
};

export type PipelineResult = {
  imported: number;
  duplicates: number;
  scored: number;
  contactsFound: number;
  drafted: number;
  errors: number;
  jobIds: string[];
  errorMessages: string[];
};
