"use client";

import Link from "next/link";
import { useState } from "react";
import type { VideoIndexEntry } from "@/types/video";
import { useThumbnailUrl } from "@/lib/hooks/useThumbnailUrl";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function VideoListRow({
  entry,
  position,
  isFirst,
  isLast,
  reorderEnabled,
}: {
  entry: VideoIndexEntry;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  reorderEnabled: boolean;
}) {
  const thumbUrl = useThumbnailUrl(entry.thumbnailId);
  const { remove, duplicate, moveUp, moveDown, moveToTop, moveToBottom } =
    useVideoStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const arrowClass =
    "flex h-7 w-7 items-center justify-center border border-rule text-ash transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-ash";

  return (
    <>
      <li className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 py-4 md:gap-6">
        {/* Priority controls */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
            #{position}
          </span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => moveToTop(entry.id)}
              disabled={!reorderEnabled || isFirst}
              className={arrowClass}
              aria-label="Move to top"
              title="Move to top"
            >
              ⇈
            </button>
            <button
              type="button"
              onClick={() => moveUp(entry.id)}
              disabled={!reorderEnabled || isFirst}
              className={arrowClass}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveDown(entry.id)}
              disabled={!reorderEnabled || isLast}
              className={arrowClass}
              aria-label="Move down"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => moveToBottom(entry.id)}
              disabled={!reorderEnabled || isLast}
              className={arrowClass}
              aria-label="Move to bottom"
              title="Move to bottom"
            >
              ⇊
            </button>
          </div>
        </div>

        {/* Thumbnail */}
        <Link
          href={`/videos/${entry.id}`}
          className="block aspect-video w-24 shrink-0 overflow-hidden border border-rule bg-paper sm:w-32"
        >
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ash">
              <span className="font-mono text-[9px] uppercase tracking-widest">
                {entry.type === "long" ? "16:9" : "9:16"}
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="min-w-0 space-y-1">
          <Link href={`/videos/${entry.id}`} className="block">
            <h3 className="truncate font-display text-xl font-medium leading-tight tracking-tight hover:text-accent">
              {entry.title || (
                <span className="italic text-ash">Untitled</span>
              )}
            </h3>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              {entry.type}
            </span>
            {(entry.channels ?? []).map((c) => (
              <span
                key={c}
                className="border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ash"
              >
                {c}
              </span>
            ))}
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
              {formatRelative(entry.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={() => duplicate(entry.id)}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:text-ink"
          >
            Duplicate
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:text-accent"
          >
            Delete
          </button>
        </div>
      </li>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this video?"
        message={`"${entry.title || "Untitled"}" and its thumbnail will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setConfirmDelete(false);
          await remove(entry.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
