"use client";

import { useEffect, useMemo, useState } from "react";
import { usePromptsStore } from "@/lib/hooks/usePromptsStore";
import { PageShell } from "@/components/ui/PageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Prompt } from "@/types/extras";

export default function PromptsPage() {
  const { prompts, loaded, load, create, update, remove } = usePromptsStore();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false)
    );
  }, [prompts, search]);

  const handleNew = () => {
    const id = create();
    setOpenId(id);
  };

  return (
    <PageShell
      title="Prompts"
      subtitle="Reusable prompts you reach for when writing scripts. Copy, paste, ship."
      actions={
        <button onClick={handleNew} className="btn">
          + New prompt
        </button>
      }
    >
      <div className="mb-8 border-b border-rule pb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, category, or content…"
          className="field max-w-md"
        />
      </div>

      {!loaded ? (
        <p className="text-ash">Loading…</p>
      ) : prompts.length === 0 ? (
        <div className="border border-dashed border-rule p-12 text-center">
          <h2 className="font-display text-3xl font-medium">
            No prompts saved.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ash">
            Save the prompts you use to generate scripts. Refining them once
            beats rewriting them every time.
          </p>
          <button onClick={handleNew} className="btn mt-6">
            Add your first prompt
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="border border-dashed border-rule p-12 text-center text-ash">
          No prompts match the search.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              open={openId === prompt.id}
              onToggle={() =>
                setOpenId(openId === prompt.id ? null : prompt.id)
              }
              onUpdate={(patch) => update(prompt.id, patch)}
              onDelete={() => remove(prompt.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PromptCard({
  prompt,
  open,
  onToggle,
  onUpdate,
  onDelete,
}: {
  prompt: Prompt;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<Omit<Prompt, "id" | "createdAt">>) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Couldn't copy. Select the text manually and copy.");
    }
  };

  return (
    <>
      <article className="border border-rule transition hover:border-ink">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 p-4 text-left"
        >
          <div className="flex-1">
            <h3 className="font-display text-xl font-medium leading-tight">
              {prompt.title || (
                <span className="italic text-ash">Untitled prompt</span>
              )}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              {prompt.category && (
                <span className="border border-rule px-2 py-0.5">
                  {prompt.category}
                </span>
              )}
              <span>
                {prompt.body.length.toLocaleString()} chars ·{" "}
                {prompt.body.split(/\s+/).filter(Boolean).length} words
              </span>
              <span>
                Updated {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-ash">
            {open ? "−" : "+"}
          </span>
        </button>

        {open && (
          <div className="space-y-4 border-t border-rule p-4">
            <div>
              <div className="label mb-1">Title</div>
              <input
                value={prompt.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Name this prompt"
                className="field"
              />
            </div>

            <div>
              <div className="label mb-1">Category (optional)</div>
              <input
                value={prompt.category ?? ""}
                onChange={(e) => onUpdate({ category: e.target.value })}
                placeholder="e.g. hook, outline, title, rewrite"
                className="field"
              />
            </div>

            <div>
              <div className="label mb-1">Prompt body</div>
              <textarea
                value={prompt.body}
                onChange={(e) => onUpdate({ body: e.target.value })}
                rows={Math.min(20, Math.max(6, prompt.body.split("\n").length + 1))}
                placeholder="Write the full prompt here. Use {placeholders} for things you'll fill in each time."
                className="field-box font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleCopy} className="btn">
                {copied ? "Copied ✓" : "Copy prompt"}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-danger ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </article>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this prompt?"
        message={`"${prompt.title || "Untitled"}" will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
