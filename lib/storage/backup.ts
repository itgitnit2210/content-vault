"use client";

import { backupSchema } from "@/lib/validation";
import {
  getVideo,
  putVideo,
  listVideoIds,
  getThumbnail,
  putThumbnail,
} from "./blobs";
import { upsertIndexEntry, readIndex, writeIndex } from "./index";
import type { Video } from "@/types/video";

interface ExportedVideo extends Video {
  _thumbnailData?: string; // base64 data URL embedded for portability
}

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

  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    videos: videos.map(stripThumbDataForSchema),
  };

  // Re-attach thumb data after schema validation
  const final = {
    ...payload,
    videos: videos,
  };

  backupSchema.parse(payload); // throw if shape is wrong

  return new Blob([JSON.stringify(final, null, 2)], {
    type: "application/json",
  });
}

function stripThumbDataForSchema(v: ExportedVideo): Video {
  const { _thumbnailData, ...rest } = v;
  return rest;
}

export async function importBackup(file: File): Promise<{
  imported: number;
  skipped: number;
}> {
  const text = await file.text();
  const json = JSON.parse(text);

  // Validate shape (thumbnail data is allowed as extra field)
  const validation = backupSchema.safeParse({
    ...json,
    videos: json.videos?.map((v: ExportedVideo) => {
      const { _thumbnailData, ...rest } = v;
      return rest;
    }),
  });

  if (!validation.success) {
    throw new Error(`Invalid backup file: ${validation.error.message}`);
  }

  const existingIds = new Set(await listVideoIds());
  let imported = 0;
  let skipped = 0;

  for (const exported of json.videos as ExportedVideo[]) {
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

    const video: Video = {
      ...stripThumbDataForSchema(exported),
      thumbnailId,
    };

    await putVideo(video);
    upsertIndexEntry(video);
    imported++;
  }

  return { imported, skipped };
}

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

/** Rebuild the localStorage index from IndexedDB (e.g., after switching browsers) */
export async function rebuildIndex(): Promise<number> {
  const ids = await listVideoIds();
  const entries = [];
  for (const id of ids) {
    const v = await getVideo(id);
    if (v) entries.push(v);
  }
  entries.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  writeIndex(entries.map((v) => ({
    id: v.id,
    type: v.type,
    status: v.status,
    title: v.title,
    thumbnailId: v.thumbnailId,
    tagsPreview: v.tags.slice(0, 4),
    updatedAt: v.updatedAt,
    scriptPreview: Object.values(v.scripts).find((s) => s?.trim())?.slice(0, 160) ?? "",
  })));
  return entries.length;
}
