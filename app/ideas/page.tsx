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

export default function IdeasPage() {
  const router = useRouter();
  const { ideas, loaded, load, create, update, remove } = useIdeasStore();
  const { createFromIdea } = useVideoStore();
  const { settings, loaded: settingsLoaded, load: loadSettings } =
    useSettingsStore();

  const [typeFilter, setTypeFilter] = useState<"all" | "long" | "short">(
    "all"
  );
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    load();
    if (!settingsLoaded) loadSettings();
  }, [load, loadSettings, settingsLoaded]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ideas.filter((i) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (channelFilter !== "all" && !i.channels.includes(channelFilter))
        return false;
      if (q && !i.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ideas, typeFilter, channelFilter, search]);

  const handleConvert = async (idea: Idea) => {
    if (!idea.title.trim()) {
      alert("Add a title before converting to a video.");
      return;
    }
    const id = await createFromIdea(idea.type, idea.title, idea.channels);
    remove(idea.id);
    router.push(`/videos/${id}`);
  };

  return (
    <PageShell
      title="Ideas"
      subtitle="Titles, hooks, half-formed thoughts. Park them here until they're ready."
      actions={
        <>
          <button
            onClick={() => {
              const id = create("short");
              setEditing(id);
            }}
            className="btn-ghost"
          >
            + Short idea
          </button>
          <button
            onClick={() => {
              const id = create("long");
              setEditing(id);
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
        </div>
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
        <div className="divide-y divide-rule border-y border-rule">
          {filtered.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              editing={editing === idea.id}
              onStartEdit={() => setEditing(idea.id)}
              onStopEdit={() => setEditing(null)}
              onUpdate={(patch) => update(idea.id, patch)}
              onDelete={() => remove(idea.id)}
              onConvert={() => handleConvert(idea)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function IdeaRow({
  idea,
  editing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onConvert,
}: {
  idea: Idea;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (patch: Partial<Omit<Idea, "id" | "createdAt">>) => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[80px_1fr_auto] md:items-start md:gap-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
          {idea.type}
        </span>

        <div className="space-y-2">
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
              className="text-left font-display text-2xl font-medium leading-tight tracking-tight hover:text-accent"
            >
              {idea.title || (
                <span className="italic text-ash">Untitled idea…</span>
              )}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ChannelMultiSelect
              selected={idea.channels}
              onChange={(channels) => onUpdate({ channels })}
            />
          </div>
        </div>

        <div className="flex shrink-0 gap-2 md:flex-col md:items-end">
          <button onClick={onConvert} className="btn-ghost">
            → Video
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-danger"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this idea?"
        message={`"${idea.title || "Untitled"}" will be removed.`}
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
