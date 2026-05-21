"use client";

import type { Platform, PlatformContent } from "@/types/video";
import { TagsInput } from "./TagsInput";

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function PlatformPanel({
  platform,
  value,
  onChange,
  onRemove,
}: {
  platform: Platform;
  value: PlatformContent;
  onChange: (next: PlatformContent) => void;
  onRemove?: () => void;
}) {
  const showDescription = platform === "youtube";
  const showCaption = platform !== "youtube";
  const showTags = platform === "youtube";

  return (
    <div className="space-y-4 border border-rule p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl font-medium">
          {PLATFORM_LABELS[platform]}
        </h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash hover:text-accent"
          >
            Remove
          </button>
        )}
      </div>

      <div>
        <div className="label mb-1">Title override (optional)</div>
        <input
          value={value.title ?? ""}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Leave empty to use main title"
          className="field"
        />
      </div>

      {showCaption && (
        <div>
          <div className="label mb-1">Caption</div>
          <textarea
            value={value.caption ?? ""}
            onChange={(e) => onChange({ ...value, caption: e.target.value })}
            rows={5}
            placeholder="What people see under your post…"
            className="field-box"
          />
        </div>
      )}

      {showDescription && (
        <div>
          <div className="label mb-1">Description</div>
          <textarea
            value={value.description ?? ""}
            onChange={(e) =>
              onChange({ ...value, description: e.target.value })
            }
            rows={8}
            placeholder="Full video description, timestamps, links…"
            className="field-box"
          />
        </div>
      )}

      {showTags && (
        <div>
          <div className="label mb-1">Tags</div>
          <TagsInput
            tags={value.tags ?? []}
            onChange={(tags) => onChange({ ...value, tags })}
            placeholder="YouTube tags"
          />
        </div>
      )}
    </div>
  );
}
