"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Video, VideoIndexEntry, VideoType } from "@/types/video";
import { emptyVideo } from "@/types/video";
import {
  readIndex,
  upsertIndexEntry,
  removeIndexEntry,
} from "@/lib/storage/index";
import {
  getVideo,
  putVideo,
  deleteVideo,
  deleteThumbnail,
  copyThumbnail,
} from "@/lib/storage/blobs";

interface Store {
  index: VideoIndexEntry[];
  loaded: boolean;
  load: () => void;
  create: (type: VideoType) => Promise<string>;
  createFromIdea: (
    type: VideoType,
    title: string,
    channels: string[]
  ) => Promise<string>;
  save: (video: Video, opts?: { snapshot?: boolean }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<string | undefined>;
  fetch: (id: string) => Promise<Video | undefined>;
}

const MAX_VERSIONS = 3;

export const useVideoStore = create<Store>((set, get) => ({
  index: [],
  loaded: false,

  load: () => {
    const idx = readIndex();
    idx.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    set({ index: idx, loaded: true });
  },

  create: async (type) => {
    const video: Video = { ...emptyVideo(type), id: nanoid(10) };
    await putVideo(video);
    upsertIndexEntry(video);
    get().load();
    return video.id;
  },

  createFromIdea: async (type, title, channels) => {
    const video: Video = {
      ...emptyVideo(type),
      id: nanoid(10),
      title,
      channels,
    };
    await putVideo(video);
    upsertIndexEntry(video);
    get().load();
    return video.id;
  },

  save: async (video, opts) => {
    const updated: Video = {
      ...video,
      updatedAt: new Date().toISOString(),
    };

    if (opts?.snapshot) {
      const existing = await getVideo(video.id);
      if (existing) {
        const { versions: _omit, ...snap } = existing;
        const versions = [
          { savedAt: existing.updatedAt, snapshot: snap },
          ...(existing.versions ?? []),
        ].slice(0, MAX_VERSIONS);
        updated.versions = versions;
      }
    } else {
      // Preserve existing versions
      const existing = await getVideo(video.id);
      if (existing?.versions) updated.versions = existing.versions;
    }

    await putVideo(updated);
    upsertIndexEntry(updated);
    get().load();
  },

  remove: async (id) => {
    const v = await getVideo(id);
    if (v?.thumbnailId) await deleteThumbnail(v.thumbnailId);
    await deleteVideo(id);
    removeIndexEntry(id);
    get().load();
  },

  duplicate: async (id) => {
    const orig = await getVideo(id);
    if (!orig) return undefined;
    const newThumbId = orig.thumbnailId
      ? await copyThumbnail(orig.thumbnailId)
      : undefined;
    const now = new Date().toISOString();
    const copy: Video = {
      ...orig,
      id: nanoid(10),
      title: orig.title ? `${orig.title} (copy)` : "Untitled (copy)",
      thumbnailId: newThumbId,
      createdAt: now,
      updatedAt: now,
      versions: undefined,
    };
    await putVideo(copy);
    upsertIndexEntry(copy);
    get().load();
    return copy.id;
  },

  fetch: async (id) => getVideo(id),
}));
