"use client";

import type { Video, VideoIndexEntry } from "@/types/video";

const INDEX_KEY = "content-vault:index:v1";

export function readIndex(): VideoIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VideoIndexEntry[];
  } catch {
    return [];
  }
}

export function writeIndex(entries: VideoIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to write index", err);
    // If quota exceeded, we'd lose the index. The full data is still in IDB.
    // In a future iteration: alert the user explicitly.
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
    updatedAt: v.updatedAt,
    scriptPreview: firstScript.slice(0, 160),
  };
}

export function upsertIndexEntry(v: Video): void {
  const entries = readIndex();
  const idx = entries.findIndex((e) => e.id === v.id);
  const entry = videoToIndexEntry(v);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  writeIndex(entries);
}

export function removeIndexEntry(id: string): void {
  const entries = readIndex().filter((e) => e.id !== id);
  writeIndex(entries);
}
