"use client";

import { useActionState, useState } from "react";
import {
  approveOutreach,
  deleteOutreach,
  sendNow,
  unapproveOutreach,
  updateOutreach,
} from "@/app/actions/outreach";
import type { ActionResult } from "@/lib/types";

const initial: ActionResult = { ok: true };

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-blue-100 text-blue-700"
      : status === "drafted"
        ? "bg-slate-100 text-slate-600"
        : status === "sent"
          ? "bg-indigo-100 text-indigo-700"
          : status === "replied"
            ? "bg-emerald-100 text-emerald-700"
            : status === "bounced"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function OutreachCard(props: {
  id: string;
  kind: string;
  status: string;
  subject: string;
  body: string;
  contactEmail: string;
  jobTitle: string;
  company: string;
  lastError?: string | null;
}) {
  const { id, kind, status, contactEmail, jobTitle, company } = props;
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(props.subject);
  const [body, setBody] = useState(props.body);

  const [saveState, saveAction, saving] = useActionState(
    async (_p: ActionResult, fd: FormData) => updateOutreach(fd),
    initial,
  );
  const [apprState, apprAction, approving] = useActionState(
    async (_p: ActionResult, fd: FormData) => approveOutreach(fd),
    initial,
  );
  const [unappState, unappAction, unapproving] = useActionState(
    async (_p: ActionResult, fd: FormData) => unapproveOutreach(fd),
    initial,
  );
  const [delState, delAction, deleting] = useActionState(
    async (_p: ActionResult, fd: FormData) => deleteOutreach(fd),
    initial,
  );
  const [sendState, sendAction, sending] = useActionState(
    async (_p: ActionResult, fd: FormData) => sendNow(fd),
    initial,
  );

  const editable = status === "drafted" || status === "approved";
  const dirty = subject !== props.subject || body !== props.body;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {kind === "followup" && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                follow-up
              </span>
            )}
            <StatusBadge status={status} />
            <span className="truncate text-sm font-semibold">
              {props.subject}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {contactEmail} &middot; {jobTitle} @ {company}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              Edit
            </button>
          )}
          {status === "drafted" && (
            <form action={apprAction}>
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={approving}
                className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {approving ? "Approving…" : "Approve"}
              </button>
            </form>
          )}
          {status === "approved" && (
            <>
              <form
                action={sendAction}
                onSubmit={(e) => {
                  if (!confirm(`Send this email to ${contactEmail}?`))
                    e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send now"}
                </button>
              </form>
              <form action={unappAction}>
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={unapproving}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Unapprove
              </button>
              </form>
            </>
          )}
          {editable && (
            <form action={delAction}>
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={deleting}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {editing ? (
        <form action={saveAction} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium"
          />
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || !dirty}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject(props.subject);
                setBody(props.body);
                setEditing(false);
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <span className="text-xs text-slate-500">{words(body)} words</span>
          </div>
          {saveState.error && (
            <p className="text-sm text-red-600">{saveState.error}</p>
          )}
          {saveState.message && (
            <p className="text-sm text-emerald-600">{saveState.message}</p>
          )}
        </form>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
            {props.body}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {words(props.body)} words
          </p>
        </>
      )}

      {props.lastError && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {props.lastError}
        </p>
      )}
      {apprState.error && (
        <p className="mt-2 text-sm text-red-600">{apprState.error}</p>
      )}
      {apprState.message && (
        <p className="mt-2 text-sm text-emerald-600">{apprState.message}</p>
      )}
      {unappState.error && (
        <p className="mt-2 text-sm text-red-600">{unappState.error}</p>
      )}
      {unappState.message && (
        <p className="mt-2 text-sm text-emerald-600">{unappState.message}</p>
      )}
      {delState.error && (
        <p className="mt-2 text-sm text-red-600">{delState.error}</p>
      )}
      {sendState.error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {sendState.error}
        </p>
      )}
      {sendState.message && (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {sendState.message}
        </p>
      )}
    </div>
  );
}
