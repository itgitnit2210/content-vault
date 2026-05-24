"use client";

import type { Video, VideoIndexEntry } from "@/types/video";

const INDEX_KEY = "content-vault:index:v1";

export function readIndex(): VideoIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VideoIndexEntry[];
    if (!Array.isArray(parsed)) return [];

    // Heal: sort by order (missing = end), then renumber 0..N-1.
    const healed = [...parsed]
      .sort((a, b) => {
        const ao = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      })
      .map((entry, i) => ({ ...entry, order: i }));

    const changed =
      healed.length !== parsed.length ||
      healed.some((h, i) => h.order !== parsed[i]?.order);
    if (changed) writeIndex(healed);

    return healed;
  } catch {
    return [];
  }
}

export function writeIndex(entries: VideoIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to write index", err);
  }
}

export function videoToIndexEntry(v: Video): VideoIndexEntry {
  const firstScript = Object.values(v.scripts).find((s) => s?.trim()) ?? "";
  return {
    id: v.id,
    type: v.type,
    status: v.status,
    title: v.title,
    thumbnailId: v.thumbnailId,
    tagsPreview: v.tags.slice(0, 4),
    channels: v.channels ?? [],
    order: v.order ?? Number.MAX_SAFE_INTEGER,
    updatedAt: v.updatedAt,
    scriptPreview: firstScript.slice(0, 160),
  };
}

export function upsertIndexEntry(v: Video): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === v.id);
  const entry = videoToIndexEntry(v);
  if (idx >= 0) {
    // Preserve existing order if video doesn't specify one
    if (typeof v.order !== "number") entry.order = entries[idx].order;
    entries[idx] = entry;
  } else {
    // New entries land at the top of the list
    entry.order = -1;
    entries.unshift(entry);
  }
  writeIndex(normalizeOrder(entries));
}

export function removeIndexEntry(id: string): void {
  const entries = readIndex().filter((e) => e.id !== id);
  writeIndex(normalizeOrder(entries));
}

/** Renumber order based on array position. Used internally. */
function normalizeOrder(entries: VideoIndexEntry[]): VideoIndexEntry[] {
  return entries.map((e, i) => ({ ...e, order: i }));
}

/** Move helpers operating directly on the index. */
export function moveVideoUp(id: string): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx <= 0) return;
  [entries[idx - 1], entries[idx]] = [entries[idx], entries[idx - 1]];
  writeIndex(normalizeOrder(entries));
}

export function moveVideoDown(id: string): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0 || idx >= entries.length - 1) return;
  [entries[idx], entries[idx + 1]] = [entries[idx + 1], entries[idx]];
  writeIndex(normalizeOrder(entries));
}

export function moveVideoToTop(id: string): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx <= 0) return;
  const [target] = entries.splice(idx, 1);
  entries.unshift(target);
  writeIndex(normalizeOrder(entries));
}

export function moveVideoToBottom(id: string): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0 || idx >= entries.length - 1) return;
  const [target] = entries.splice(idx, 1);
  entries.push(target);
  writeIndex(normalizeOrder(entries));
}
