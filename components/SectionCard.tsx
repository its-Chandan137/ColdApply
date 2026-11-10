"use client";

import { useActionState, useState } from "react";
import { deleteSection, updateSection } from "@/app/actions/profile";
import type { ActionResult } from "@/lib/types";
import { SECTION_TYPES } from "@/lib/types";

type Props = {
  id: string;
  type: string;
  title: string;
  content: string;
  updatedAt: string;
};

const initial: ActionResult = { ok: true };

export default function SectionCard({ id, type, title, content, updatedAt }: Props) {
  const [editing, setEditing] = useState(false);
  const [localType, setLocalType] = useState(type);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);

  const [saveState, saveAction, saving] = useActionState(
    async (_p: ActionResult, fd: FormData) => updateSection(fd),
    initial,
  );
  const [delState, delAction, deleting] = useActionState(
    async (_p: ActionResult, fd: FormData) => deleteSection(fd),
    initial,
  );

  const dirty = localType !== type || localTitle !== title || localContent !== content;

  if (!editing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
              {type}
            </span>
            <h3 className="inline text-sm font-semibold">{title}</h3>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              Edit
            </button>
            <form
              action={delAction}
              onSubmit={(e) => {
                if (!confirm(`Delete section "${title}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={deleting}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{content}</p>
        <p className="mt-2 text-[11px] text-slate-400">
          updated {new Date(updatedAt).toLocaleString()}
        </p>
        {delState.error && (
          <p className="mt-2 text-sm text-red-600">{delState.error}</p>
        )}
      </div>
    );
  }

  return (
    <form
      action={saveAction}
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-48">
          <span className="text-xs font-medium text-slate-600">Title</span>
          <input
            name="title"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Type</span>
          <select
            name="type"
            value={localType}
            onChange={(e) => setLocalType(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">Content</span>
        <textarea
          name="content"
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          required
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving & re-embedding…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setLocalType(type);
            setLocalTitle(title);
            setLocalContent(content);
            setEditing(false);
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
        {saving && (
          <span className="text-xs text-slate-500">Embedding chunks…</span>
        )}
      </div>
      {saveState.error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveState.error}
        </p>
      )}
      {saveState.message && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveState.message}
        </p>
      )}
    </form>
  );
}
