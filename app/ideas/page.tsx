"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIdeasStore } from "@/lib/hooks/useIdeasStore";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { useSettingsStore } from "@/lib/hooks/useSettingsStore";
import { PageShell } from "@/components/ui/PageShell";
import { ChannelMultiSelect } from "@/components/ui/ChannelMultiSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Idea } from "@/types/extras";

const PAGE_SIZE = 20;

export default function IdeasPage() {
  const router = useRouter();
  const {
    ideas,
    loaded,
    load,
    create,
    update,
    remove,
    toggleDone,
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
  } = useIdeasStore();
  const { createFromIdea } = useVideoStore();
  const { settings, loaded: settingsLoaded, load: loadSettings } =
    useSettingsStore();

  const [typeFilter, setTypeFilter] = useState<"all" | "long" | "short">(
    "all"
  );
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
    if (!settingsLoaded) loadSettings();
  }, [load, loadSettings, settingsLoaded]);

  const filtersActive =
    typeFilter !== "all" ||
    channelFilter !== "all" ||
    search.trim() !== "" ||
    hideDone;

  useEffect(() => {
    setPage(1);
  }, [typeFilter, channelFilter, search, hideDone]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ideas.filter((i) => {
      if (hideDone && i.done) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (channelFilter !== "all" && !i.channels.includes(channelFilter))
        return false;
      if (q && !i.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ideas, typeFilter, channelFilter, search, hideDone]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const doneCount = ideas.filter((i) => i.done).length;
  const activeCount = ideas.length - doneCount;

  const handleConvert = async (idea: Idea) => {
    if (!idea.title.trim()) {
      alert("Add a title before converting to a video.");
      return;
    }
    const id = await createFromIdea(idea.type, idea.title, idea.channels);
    // Mark the idea done instead of deleting
    if (!idea.done) toggleDone(idea.id);
    router.push(`/videos/${id}`);
  };

  const handleMoveUp = (ideaId: string, indexOnPage: number) => {
    moveUp(ideaId);
    if (indexOnPage === 0 && currentPage > 1) setPage(currentPage - 1);
  };

  const handleMoveDown = (ideaId: string, indexOnPage: number) => {
    moveDown(ideaId);
    if (indexOnPage === pageItems.length - 1 && currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  const handleMoveToTop = (ideaId: string) => {
    moveToTop(ideaId);
    setPage(1);
  };

  const handleMoveToBottom = (ideaId: string) => {
    moveToBottom(ideaId);
    setPage(totalPages);
  };

  return (
    <PageShell
      title="Ideas"
      subtitle="Titles, hooks, half-formed thoughts. Top of the list = highest priority. Done ones sink to the bottom."
      actions={
        <>
          <button
            onClick={() => {
              const id = create("short");
              setEditing(id);
              setPage(1);
            }}
            className="btn-ghost"
          >
            + Short idea
          </button>
          <button
            onClick={() => {
              const id = create("long");
              setEditing(id);
              setPage(1);
            }}
            className="btn"
          >
            + Long-form idea
          </button>
        </>
      }
    >
      <div className="mb-8 flex flex-col gap-4 border-b border-rule pb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas…"
          className="field max-w-md"
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="label">Type</span>
            {(["all", "long", "short"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                  typeFilter === t
                    ? "border-b border-ink text-ink"
                    : "text-ash hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {settingsLoaded && settings.channels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="label">Channel</span>
              <button
                onClick={() => setChannelFilter("all")}
                className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                  channelFilter === "all"
                    ? "border-b border-ink text-ink"
                    : "text-ash hover:text-ink"
                }`}
              >
                all
              </button>
              {settings.channels.map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                    channelFilter === c
                      ? "border-b border-ink text-ink"
                      : "text-ash hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="label">Done</span>
            <button
              onClick={() => setHideDone(false)}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                !hideDone
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              show ({doneCount})
            </button>
            <button
              onClick={() => setHideDone(true)}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                hideDone
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              hide
            </button>
          </div>
        </div>
        {filtersActive && (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
            Reordering is disabled while filters are active.{" "}
            {activeCount} active · {doneCount} done.
          </p>
        )}
      </div>

      {!loaded ? (
        <p className="text-ash">Loading…</p>
      ) : ideas.length === 0 ? (
        <p className="border border-dashed border-rule p-12 text-center text-ash">
          No ideas yet. The next one comes in a shower, on a walk, or three
          minutes before sleep.
        </p>
      ) : filtered.length === 0 ? (
        <p className="border border-dashed border-rule p-12 text-center text-ash">
          No ideas match the current filters.
        </p>
      ) : (
        <>
          <ol className="divide-y divide-rule border-y border-rule">
            {pageItems.map((idea, idx) => {
              const globalPosition = pageStart + idx + 1;
              return (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  position={globalPosition}
                  isFirst={globalPosition === 1}
                  isLast={globalPosition === filtered.length}
                  reorderEnabled={!filtersActive}
                  editing={editing === idea.id}
                  onStartEdit={() => setEditing(idea.id)}
                  onStopEdit={() => setEditing(null)}
                  onUpdate={(patch) => update(idea.id, patch)}
                  onDelete={() => remove(idea.id)}
                  onToggleDone={() => toggleDone(idea.id)}
                  onConvert={() => handleConvert(idea)}
                  onMoveUp={() => handleMoveUp(idea.id, idx)}
                  onMoveDown={() => handleMoveDown(idea.id, idx)}
                  onMoveToTop={() => handleMoveToTop(idea.id)}
                  onMoveToBottom={() => handleMoveToBottom(idea.id)}
                />
              );
            })}
          </ol>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </PageShell>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const pages = buildPageList(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 md:flex-row md:items-center md:justify-between"
      aria-label="Pagination"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border border-rule px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-ash"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 font-mono text-[10px] text-ash">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                p === currentPage
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ash hover:border-ink hover:text-ink"
              }`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border border-rule px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-ash"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [];
  pages.push(1);
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function IdeaRow({
  idea,
  position,
  isFirst,
  isLast,
  reorderEnabled,
  editing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onToggleDone,
  onConvert,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
}: {
  idea: Idea;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  reorderEnabled: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (patch: Partial<Omit<Idea, "id" | "createdAt">>) => void;
  onDelete: () => void;
  onToggleDone: () => void;
  onConvert: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const arrowClass =
    "flex h-7 w-7 items-center justify-center border border-rule text-ash transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-ash";

  const doneClasses = idea.done ? "opacity-50" : "";

  return (
    <>
      <li
        className={`grid grid-cols-[auto_1fr_auto] items-start gap-4 py-4 md:gap-6 ${doneClasses}`}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
            #{position}
          </span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onMoveToTop}
              disabled={!reorderEnabled || isFirst}
              className={arrowClass}
              aria-label="Move to top"
              title="Move to top"
            >
              ⇈
            </button>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!reorderEnabled || isFirst}
              className={arrowClass}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!reorderEnabled || isLast}
              className={arrowClass}
              aria-label="Move down"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onMoveToBottom}
              disabled={!reorderEnabled || isLast}
              className={arrowClass}
              aria-label="Move to bottom"
              title="Move to bottom"
            >
              ⇊
            </button>
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash shrink-0">
              {idea.type}
            </span>
            {idea.done && (
              <span className="border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ash shrink-0">
                ✓ done
              </span>
            )}
            {editing ? (
              <input
                autoFocus
                value={idea.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                onBlur={onStopEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onStopEdit();
                }}
                placeholder="What's the idea?"
                className="w-full bg-transparent font-display text-2xl font-medium leading-tight tracking-tight placeholder:text-ash/50 focus:outline-none"
              />
            ) : (
              <button
                onClick={onStartEdit}
                className={`text-left font-display text-2xl font-medium leading-tight tracking-tight hover:text-accent ${
                  idea.done ? "line-through decoration-ash/60" : ""
                }`}
              >
                {idea.title || (
                  <span className="italic text-ash">Untitled idea…</span>
                )}
              </button>
            )}
          </div>
          <ChannelMultiSelect
            selected={idea.channels}
            onChange={(channels) => onUpdate({ channels })}
          />
          {idea.done && idea.doneAt && (
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              Done {new Date(idea.doneAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button onClick={onToggleDone} className="btn-ghost">
            {idea.done ? "↺ Reopen" : "✓ Mark done"}
          </button>
          {!idea.done && (
            <button onClick={onConvert} className="btn-ghost">
              → Video
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-danger"
          >
            Delete
          </button>
        </div>
      </li>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this idea?"
        message={`"${idea.title || "Untitled"}" will be removed permanently. Marking it done keeps it as a record — delete only if you'll never want to see it again.`}
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
