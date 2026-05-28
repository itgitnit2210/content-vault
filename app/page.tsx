"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { VideoListRow } from "@/components/dashboard/VideoListRow";
import { FilterBar, type Filters } from "@/components/dashboard/FilterBar";
import { PageShell } from "@/components/ui/PageShell";
import {
  exportAll,
  importBackup,
  downloadBlob,
} from "@/lib/storage/backup";

const VIEW_PREF_KEY = "content-vault:dashboard-view";

export default function DashboardPage() {
  const router = useRouter();
  const { index, loaded, load, create } = useVideoStore();
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "all",
    status: "all",
    channel: "all",
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VIEW_PREF_KEY);
      if (saved === "list" || saved === "grid") setView(saved);
    }
  }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_PREF_KEY, view);
    }
  }, [view]);

  const filtersActive =
    filters.search.trim() !== "" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.channel !== "all";

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return index.filter((v) => {
      if (filters.type !== "all" && v.type !== filters.type) return false;
      if (filters.status !== "all" && v.status !== filters.status)
        return false;
      if (
        filters.channel !== "all" &&
        !(v.channels ?? []).includes(filters.channel)
      )
        return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.tagsPreview.some((t) => t.toLowerCase().includes(q)) ||
        v.scriptPreview.toLowerCase().includes(q)
      );
    });
  }, [index, filters]);

  const handleNew = async (type: "long" | "short") => {
    const id = await create(type);
    router.push(`/videos/${id}`);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const blob = await exportAll();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `content-vault-${date}.json`);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const result = await importBackup(file);
      load();
      // Force a reload so Ideas/Prompts/Settings pages pick up imported data
      const lines = [
        `Backup format: v${result.backupVersion}`,
        `Videos: ${result.videos.imported} imported, ${result.videos.skipped} skipped (already exist)`,
      ];
      if (result.backupVersion === 2) {
        lines.push(
          `Ideas: ${result.ideas.imported} imported, ${result.ideas.skipped} skipped`,
          `Prompts: ${result.prompts.imported} imported, ${result.prompts.skipped} skipped`,
          `Settings: ${result.settingsMerged ? "merged" : "not present"}`
        );
      } else {
        lines.push(
          "(This is a legacy backup — only videos restored. Ideas/prompts/settings need a fresh v2 backup.)"
        );
      }
      alert(lines.join("\n"));
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Vault"
      subtitle="Scripts, captions, thumbnails. Top of the list = next video to make."
      actions={
        <>
          <button
            onClick={handleExport}
            disabled={busy}
            className="btn-ghost disabled:opacity-40"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-ghost disabled:opacity-40"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleImport(file);
              e.target.value = "";
            }}
          />
          <button onClick={() => handleNew("short")} className="btn-ghost">
            + Short
          </button>
          <button onClick={() => handleNew("long")} className="btn">
            + Long-form
          </button>
        </>
      }
    >
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        total={index.length}
        showing={filtered.length}
      />

      {loaded && index.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="label">View</span>
            <button
              onClick={() => setView("grid")}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                view === "grid"
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                view === "list"
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              List (reorder)
            </button>
          </div>
          {view === "list" && filtersActive && (
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              Clear filters to reorder
            </span>
          )}
        </div>
      )}

      {!loaded ? (
        <p className="text-ash">Loading…</p>
      ) : index.length === 0 ? (
        <EmptyState onCreate={handleNew} />
      ) : filtered.length === 0 ? (
        <p className="border border-dashed border-rule p-12 text-center text-ash">
          No videos match the current filters.
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <VideoCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <ol className="divide-y divide-rule border-y border-rule">
          {filtered.map((entry, idx) => (
            <VideoListRow
              key={entry.id}
              entry={entry}
              position={idx + 1}
              isFirst={idx === 0}
              isLast={idx === filtered.length - 1}
              reorderEnabled={!filtersActive}
            />
          ))}
        </ol>
      )}
    </PageShell>
  );
}

function EmptyState({
  onCreate,
}: {
  onCreate: (t: "long" | "short") => void;
}) {
  return (
    <div className="border border-dashed border-rule p-12 text-center">
      <h2 className="font-display text-3xl font-medium">
        Your vault is empty.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-ash">
        Every video starts as an idea. Capture it here, develop the script,
        write the captions, attach a thumbnail. Ship faster.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={() => onCreate("long")} className="btn">
          Start a long-form
        </button>
        <button onClick={() => onCreate("short")} className="btn-ghost">
          Start a short
        </button>
      </div>
    </div>
  );
}
