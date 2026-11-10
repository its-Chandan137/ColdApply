# ColdAuto — cold email job outreach (local, single user)

Next.js (App Router, TypeScript) + Prisma/SQLite + Tailwind. A separate
`worker.ts` (tsx + node-cron) handles sending, reply polling and follow-ups.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:

   | Var | Meaning |
   | --- | --- |
   | `GEMINI_API_KEY` | primary LLM + embeddings |
   | `GROQ_API_KEY` | fallback LLM when Gemini rate-limits |
   | `GEMINI_MODEL` | e.g. `gemini-2.0-flash` |
   | `GROQ_MODEL` | e.g. `llama-3.3-70b-versatile` |
   | `EMBED_MODEL` | e.g. `models/text-embedding-004` |
   | `GMAIL_USER` | your Gmail address |
   | `GMAIL_APP_PASSWORD` | Gmail App Password (2FA required) |
   | `DAILY_SEND_CAP` | max sends per day (default 20) |

3. `npm run db:push` — creates `prisma/dev.db`
4. `npm run dev` — UI on http://localhost:3000
5. `npm run worker` — background worker (send / replies / follow-ups)

## Safety rules (enforced in code)

- **Nothing is sent without approval.** Drafts → approve → send. Auto-send is a
  separate off-by-default switch on Settings.
- **Never send twice to the same email within 10 days** (`lib/send.ts`).
- **Daily cap** (`DAILY_SEND_CAP`), enforced for worker *and* manual sends.
- **Random 2–6 minute gap** between sends (pacing gate).
- **Errors are shown in the UI**: server actions return error strings and the
  Dashboard has a “Recent errors” panel (`AppLog`).

## Features

1. **Profile** — upload resume PDF → text → LLM sections → edit → chunk +
   Gemini embeddings (re-embedded on every save).
2. **Jobs** — add posting (URL + description) → top-k cosine retrieval over
   profile chunks → LLM `{score, reasons[], gaps[]}`.
3. **Contacts** — manual add + emails auto-extracted from job descriptions.
4. **Draft** — jobs scoring ≥ 70 with a contact get a 100–120 word email built
   only from retrieved profile facts, with a one-line opt-out. Edit/approve in
   **Outreach**.
5. **Send** — worker sends approved mail via Gmail SMTP, saves the Message-ID,
   sets `followUpDueAt = +6 days`.
6. **Replies** — worker polls Gmail IMAP every 10 min; `In-Reply-To`/`References`
   → `replied`, delivery failures → `bounced`.
7. **Dashboard** — sent today/week, replied, bounced, filters, per-row status +
   notes, follow-ups due, follow-up drafts (approval required), recent errors.

## Commands

```bash
npm run dev        # UI
npm run worker     # background worker
npm run db:push    # sync schema -> SQLite
npm run db:studio  # browse data
npm run lint
npx tsc --noEmit   # typecheck
```
