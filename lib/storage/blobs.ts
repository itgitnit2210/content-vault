"use client";

import { createStore, get, set, del, keys } from "idb-keyval";
import type { Video } from "@/types/video";

const videoStore = createStore("content-vault-videos", "videos");
const thumbStore = createStore("content-vault-thumbs", "thumbnails");

export async function getVideo(id: string): Promise<Video | undefined> {
  return get<Video>(id, videoStore);
}

export async function putVideo(video: Video): Promise<void> {
  await set(video.id, video, videoStore);
}

export async function deleteVideo(id: string): Promise<void> {
  await del(id, videoStore);
}

export async function listVideoIds(): Promise<string[]> {
  const k = await keys(videoStore);
  return k.map((x) => String(x));
}

/** Store a thumbnail file/blob, return the key. */
export async function putThumbnail(blob: Blob): Promise<string> {
  const id = `thumb_${crypto.randomUUID()}`;
  await set(id, blob, thumbStore);
  return id;
}

export async function getThumbnail(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, thumbStore);
}

export async function deleteThumbnail(id: string): Promise<void> {
  await del(id, thumbStore);
}

/** Copy a thumbnail to a new key (used when duplicating videos) */
export async function copyThumbnail(id: string): Promise<string | undefined> {
  const blob = await getThumbnail(id);
  if (!blob) return undefined;
  return putThumbnail(blob);
}

/** Returns a blob URL for display; caller must revoke when done. */
export async function getThumbnailUrl(
  id: string | undefined
): Promise<string | undefined> {
  if (!id) return undefined;
  const blob = await getThumbnail(id);
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
}
