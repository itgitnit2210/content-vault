"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Platform, Video, VideoStatus } from "@/types/video";
import { VIDEO_STATUSES } from "@/types/video";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { useDebouncedEffect } from "@/lib/hooks/useDebouncedEffect";
import { ThumbnailUploader } from "./ThumbnailUploader";
import { ScriptEditor } from "./ScriptEditor";
import { PlatformPanel } from "./PlatformPanel";
import { TagsInput } from "./TagsInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ChannelMultiSelect } from "@/components/ui/ChannelMultiSelect";

const ALL_PLATFORMS: Platform[] = ["youtube", "instagram", "tiktok"];

export function VideoForm({ initial }: { initial: Video }) {
  const router = useRouter();
  const { save, remove } = useVideoStore();
  const [video, setVideo] = useState<Video>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstRenderRef = useRef(true);
  const tabIdRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random())
  );

  // Warn on unsaved changes if user is navigating away mid-save
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saving]);

  // Detect cross-tab conflicts
  useEffect(() => {
    const channel = new BroadcastChannel("content-vault-edits");
    const tabId = tabIdRef.current;
    const onMessage = (e: MessageEvent) => {
      if (
        e.data?.type === "saved" &&
        e.data?.id === video.id &&
        e.data?.from !== tabId
      ) {
        alert(
          "This video was just saved in another tab. Reload to see the latest version, or your next save will overwrite it."
        );
      }
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [video.id]);

  const persist = useCallback(
    async (v: Video, snapshot = false) => {
      setSaving(true);
      try {
        await save(v, { snapshot });
        setSavedAt(new Date());
        const channel = new BroadcastChannel("content-vault-edits");
        channel.postMessage({ type: "saved", id: v.id, from: tabIdRef.current });
        channel.close();
      } finally {
        setSaving(false);
      }
    },
    [save]
  );

  // Autosave (debounced)
  useDebouncedEffect(
    () => {
      if (firstRenderRef.current) {
        firstRenderRef.current = false;
        return;
      }
      persist(video);
    },
    [video],
    700
  );

  const update = <K extends keyof Video>(key: K, value: Video[K]) => {
    setVideo((v) => ({ ...v, [key]: value }));
  };

  const setPlatform = (p: Platform, content: Video["platforms"][Platform]) => {
    setVideo((v) => ({ ...v, platforms: { ...v.platforms, [p]: content } }));
  };

  const addPlatform = (p: Platform) => {
    if (video.platforms[p]) return;
    setPlatform(p, {});
  };

  const removePlatform = (p: Platform) => {
    setVideo((v) => {
      const { [p]: _, ...rest } = v.platforms;
      return { ...v, platforms: rest };
    });
  };

  const handleDelete = async () => {
    await remove(video.id);
    router.push("/");
  };

  const handleSnapshotSave = async () => {
    await persist(video, true);
  };

  const usedPlatforms = ALL_PLATFORMS.filter((p) => video.platforms[p]);
  const availablePlatforms = ALL_PLATFORMS.filter((p) => !video.platforms[p]);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
      {/* MAIN COLUMN */}
      <div className="space-y-10">
        <div>
          <div className="label mb-2">Title</div>
          <input
            value={video.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Untitled video"
            className="w-full bg-transparent font-display text-4xl font-medium leading-tight tracking-tight placeholder:text-ash/50 focus:outline-none md:text-5xl"
          />
        </div>

        <ScriptEditor
          scripts={video.scripts}
          onChange={(scripts) => update("scripts", scripts)}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="label">Platforms</span>
            {availablePlatforms.length > 0 && (
              <div className="flex gap-2">
                {availablePlatforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addPlatform(p)}
                    className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash hover:text-ink"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            {usedPlatforms.map((p) => (
              <PlatformPanel
                key={p}
                platform={p}
                value={video.platforms[p] ?? {}}
                onChange={(content) => setPlatform(p, content)}
                onRemove={() => removePlatform(p)}
              />
            ))}
            {usedPlatforms.length === 0 && (
              <p className="border border-dashed border-rule p-6 text-center text-sm text-ash">
                No platforms added. Add YouTube, Instagram, or TikTok above.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="label mb-2">Notes</div>
          <textarea
            value={video.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={6}
            placeholder="Ideas, references, shot list…"
            className="field-box"
          />
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
        <div className="space-y-1 border-b border-rule pb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
          {saving ? (
            <span>Saving…</span>
          ) : savedAt ? (
            <span>Saved {savedAt.toLocaleTimeString()}</span>
          ) : (
            <span>Auto-save on</span>
          )}
        </div>

        <div>
          <div className="label mb-2">Format</div>
          <div className="flex border border-rule">
            {(["long", "short"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update("type", t)}
                className={`flex-1 py-2 font-mono text-xs uppercase tracking-[0.15em] transition ${
                  video.type === t
                    ? "bg-ink text-paper"
                    : "text-ash hover:bg-paper hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-2">Status</div>
          <div className="space-y-1">
            {VIDEO_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update("status", s)}
                className={`flex w-full items-center justify-between border px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.15em] transition ${
                  video.status === s
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ash hover:border-ink hover:text-ink"
                }`}
              >
                <span>{s}</span>
                {video.status === s && <span>●</span>}
              </button>
            ))}
          </div>
        </div>

        <ThumbnailUploader
          thumbnailId={video.thumbnailId}
          onChange={(id) => update("thumbnailId", id)}
        />

        <div>
          <div className="label mb-2">Channels</div>
          <ChannelMultiSelect
            selected={video.channels ?? []}
            onChange={(channels) => update("channels", channels)}
          />
        </div>

        <div>
          <div className="label mb-2">Tags</div>
          <TagsInput
            tags={video.tags}
            onChange={(tags) => update("tags", tags)}
          />
        </div>

        <div className="space-y-2 border-t border-rule pt-6">
          <button
            type="button"
            onClick={handleSnapshotSave}
            className="btn-ghost w-full justify-center"
          >
            Save version snapshot
          </button>

          {video.versions && video.versions.length > 0 && (
            <details className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              <summary className="cursor-pointer py-2">
                {video.versions.length} version
                {video.versions.length === 1 ? "" : "s"}
              </summary>
              <div className="space-y-2 pl-3">
                {video.versions.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (confirm("Restore this version? Current state will be saved as a new snapshot.")) {
                        setVideo({ ...v.snapshot, versions: video.versions });
                      }
                    }}
                    className="block w-full text-left hover:text-ink"
                  >
                    {new Date(v.savedAt).toLocaleString()}
                  </button>
                ))}
              </div>
            </details>
          )}

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-danger w-full justify-center"
          >
            Delete video
          </button>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
          Created {new Date(video.createdAt).toLocaleDateString()}
          <br />
          ID {video.id}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this video?"
        message="The video and its thumbnail will be permanently removed. Export a backup first if you might want it later."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
