"use client";

import {
  backupSchemaV1,
  backupSchemaV2,
} from "@/lib/validation";
import {
  getVideo,
  putVideo,
  listVideoIds,
  getThumbnail,
  putThumbnail,
} from "./blobs";
import {
  upsertIndexEntry,
  writeIndex,
} from "./index";
import type { Video } from "@/types/video";
import type { Idea, Prompt, AppSettings } from "@/types/extras";
import { DEFAULT_SETTINGS } from "@/types/extras";

const IDEAS_KEY = "content-vault:ideas:v1";
const PROMPTS_KEY = "content-vault:prompts:v1";
const SETTINGS_KEY = "content-vault:settings:v1";

interface ExportedVideo extends Video {
  _thumbnailData?: string;
}

// ============================================================================
// EXPORT
// ============================================================================

export async function exportAll(): Promise<Blob> {
  const ids = await listVideoIds();
  const videos: ExportedVideo[] = [];

  for (const id of ids) {
    const v = await getVideo(id);
    if (!v) continue;
    const exported: ExportedVideo = { ...v };
    if (v.thumbnailId) {
      const blob = await getThumbnail(v.thumbnailId);
      if (blob) {
        exported._thumbnailData = await blobToDataUrl(blob);
      }
    }
    videos.push(exported);
  }

  const ideas = readLS<Idea[]>(IDEAS_KEY, []);
  const prompts = readLS<Prompt[]>(PROMPTS_KEY, []);
  const settings = readLS<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);

  // Build the v2 payload. Thumbnail data is allowed as extra field on videos.
  const payload = {
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    videos,
    ideas,
    prompts,
    settings,
  };

  // Validate the shape WITHOUT thumbnail data (it's not in the schema)
  const validatePayload = {
    ...payload,
    videos: videos.map(stripThumbDataForSchema),
  };
  backupSchemaV2.parse(validatePayload);

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

function stripThumbDataForSchema(v: ExportedVideo): Video {
  const { _thumbnailData, ...rest } = v;
  return rest;
}

// ============================================================================
// IMPORT
// ============================================================================

export interface ImportResult {
  videos: { imported: number; skipped: number };
  ideas: { imported: number; skipped: number };
  prompts: { imported: number; skipped: number };
  settingsMerged: boolean;
  backupVersion: 1 | 2;
}

export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  const json = JSON.parse(text);

  // Detect version
  const version = json.version === 2 ? 2 : 1;

  // Strip thumb data for schema validation
  const forValidation = {
    ...json,
    videos: json.videos?.map((v: ExportedVideo) => {
      const { _thumbnailData, ...rest } = v;
      return rest;
    }),
  };

  if (version === 2) {
    const parsed = backupSchemaV2.safeParse(forValidation);
    if (!parsed.success) {
      throw new Error(`Invalid v2 backup: ${parsed.error.message}`);
    }
  } else {
    const parsed = backupSchemaV1.safeParse(forValidation);
    if (!parsed.success) {
      throw new Error(`Invalid v1 backup: ${parsed.error.message}`);
    }
  }

  // Import videos (same logic for both versions)
  const videoResult = await importVideos(json.videos ?? []);

  // v2 additions
  let ideaResult = { imported: 0, skipped: 0 };
  let promptResult = { imported: 0, skipped: 0 };
  let settingsMerged = false;

  if (version === 2) {
    if (Array.isArray(json.ideas)) {
      ideaResult = importIdeas(json.ideas);
    }
    if (Array.isArray(json.prompts)) {
      promptResult = importPrompts(json.prompts);
    }
    if (json.settings && typeof json.settings === "object") {
      mergeSettings(json.settings);
      settingsMerged = true;
    }
  }

  return {
    videos: videoResult,
    ideas: ideaResult,
    prompts: promptResult,
    settingsMerged,
    backupVersion: version,
  };
}

async function importVideos(
  videos: ExportedVideo[]
): Promise<{ imported: number; skipped: number }> {
  const existingIds = new Set(await listVideoIds());
  let imported = 0;
  let skipped = 0;

  for (const exported of videos) {
    if (existingIds.has(exported.id)) {
      skipped++;
      continue;
    }

    let thumbnailId: string | undefined;
    if (exported._thumbnailData) {
      try {
        const blob = await dataUrlToBlob(exported._thumbnailData);
        thumbnailId = await putThumbnail(blob);
      } catch (e) {
        console.warn("Failed to restore thumbnail for", exported.id, e);
      }
    }

    const { _thumbnailData, ...rest } = exported;
    const video: Video = {
      ...rest,
      thumbnailId,
    } as Video;

    await putVideo(video);
    upsertIndexEntry(video);
    imported++;
  }

  return { imported, skipped };
}

function importIdeas(incoming: Idea[]): { imported: number; skipped: number } {
  const existing = readLS<Idea[]>(IDEAS_KEY, []);
  const existingIds = new Set(existing.map((i) => i.id));
  let imported = 0;
  let skipped = 0;

  const toAdd: Idea[] = [];
  for (const idea of incoming) {
    if (existingIds.has(idea.id)) {
      skipped++;
    } else {
      toAdd.push(idea);
      imported++;
    }
  }

  if (toAdd.length > 0) {
    // Append imported ideas after existing ones, then renumber
    const merged = [...existing, ...toAdd];
    const normalized = merged.map((idea, i) => ({ ...idea, order: i }));
    writeLS(IDEAS_KEY, normalized);
  }

  return { imported, skipped };
}

function importPrompts(
  incoming: Prompt[]
): { imported: number; skipped: number } {
  const existing = readLS<Prompt[]>(PROMPTS_KEY, []);
  const existingIds = new Set(existing.map((p) => p.id));
  let imported = 0;
  let skipped = 0;

  const toAdd: Prompt[] = [];
  for (const prompt of incoming) {
    if (existingIds.has(prompt.id)) {
      skipped++;
    } else {
      toAdd.push(prompt);
      imported++;
    }
  }

  if (toAdd.length > 0) {
    writeLS(PROMPTS_KEY, [...toAdd, ...existing]);
  }

  return { imported, skipped };
}

function mergeSettings(incoming: AppSettings): void {
  const existing = readLS<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  // Union of channel names, preserving existing order then appending new
  const seen = new Set(existing.channels);
  const merged = [...existing.channels];
  for (const c of incoming.channels ?? []) {
    if (!seen.has(c)) {
      merged.push(c);
      seen.add(c);
    }
  }
  writeLS(SETTINGS_KEY, { ...existing, channels: merged });
}

// ============================================================================
// HELPERS
// ============================================================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key}`, err);
  }
}

/** Rebuild the localStorage index from IndexedDB */
export async function rebuildIndex(): Promise<number> {
  const ids = await listVideoIds();
  const entries: Video[] = [];
  for (const id of ids) {
    const v = await getVideo(id);
    if (v) entries.push(v);
  }
  entries.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  writeIndex(
    entries.map((v, i) => ({
      id: v.id,
      type: v.type,
      status: v.status,
      title: v.title,
      thumbnailId: v.thumbnailId,
      tagsPreview: v.tags.slice(0, 4),
      channels: v.channels ?? [],
      order: v.order ?? i,
      updatedAt: v.updatedAt,
      scriptPreview:
        Object.values(v.scripts).find((s) => s?.trim())?.slice(0, 160) ?? "",
    }))
  );
  return entries.length;
}
