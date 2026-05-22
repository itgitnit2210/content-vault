"use client";

import Link from "next/link";
import { useState } from "react";
import type { VideoIndexEntry } from "@/types/video";
import { useThumbnailUrl } from "@/lib/hooks/useThumbnailUrl";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function VideoCard({ entry }: { entry: VideoIndexEntry }) {
  const thumbUrl = useThumbnailUrl(entry.thumbnailId);
  const { remove, duplicate } = useVideoStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <article className="group relative flex flex-col border border-rule bg-paper/60 transition hover:border-ink">
        <Link
          href={`/videos/${entry.id}`}
          className="flex flex-1 flex-col"
          aria-label={`Edit ${entry.title || "Untitled"}`}
        >
          <div className="relative aspect-video w-full overflow-hidden border-b border-rule bg-paper">
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ash">
                <span className="font-mono text-xs uppercase tracking-widest">
                  {entry.type === "long" ? "16 : 9" : "9 : 16"}
                </span>
              </div>
            )}
            <span className="absolute left-3 top-3">
              <StatusBadge status={entry.status} />
            </span>
            <span className="absolute right-3 top-3 border border-ink bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
              {entry.type === "long" ? "long" : "short"}
            </span>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
              {entry.title || (
                <span className="text-ash italic">Untitled</span>
              )}
            </h3>
            {entry.scriptPreview && (
              <p className="mt-2 line-clamp-3 text-sm text-ash">
                {entry.scriptPreview}
              </p>
            )}
            <div className="mt-auto flex items-center justify-between pt-4">
              <div className="flex flex-wrap gap-1">
                {(entry.channels ?? []).slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ash"
                  >
                    {c}
                  </span>
                ))}
                {entry.tagsPreview.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] uppercase tracking-wider text-ash"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ash">
                {formatRelative(entry.updatedAt)}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex border-t border-rule">
          <button
            onClick={async (e) => {
              e.preventDefault();
              await duplicate(entry.id);
            }}
            className="flex-1 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:bg-ink hover:text-paper"
          >
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="flex-1 border-l border-rule py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:bg-accent hover:text-paper"
          >
            Delete
          </button>
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this video?"
        message={`"${entry.title || "Untitled"}" and its thumbnail will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setConfirmOpen(false);
          await remove(entry.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
