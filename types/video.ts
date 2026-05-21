export type VideoType = "long" | "short";

export type VideoStatus =
  | "idea"
  | "drafting"
  | "ready"
  | "recorded"
  | "edited"
  | "scheduled"
  | "published";

export const VIDEO_STATUSES: VideoStatus[] = [
  "idea",
  "drafting",
  "ready",
  "recorded",
  "edited",
  "scheduled",
  "published",
];

export type Platform = "youtube" | "instagram" | "tiktok";

export interface PlatformContent {
  caption?: string;
  description?: string;
  tags?: string[];
  title?: string;
}

export interface VideoVersion {
  savedAt: string;
  snapshot: Omit<Video, "versions">;
}

export interface Video {
  id: string;
  type: VideoType;
  status: VideoStatus;
  title: string;
  scripts: Record<string, string>;
  thumbnailId?: string;
  platforms: Partial<Record<Platform, PlatformContent>>;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions?: VideoVersion[];
}

/** Lightweight index entry stored in localStorage for instant dashboard load */
export interface VideoIndexEntry {
  id: string;
  type: VideoType;
  status: VideoStatus;
  title: string;
  thumbnailId?: string;
  tagsPreview: string[];
  updatedAt: string;
  scriptPreview: string;
}

export function emptyVideo(type: VideoType): Video {
  const now = new Date().toISOString();
  return {
    id: "",
    type,
    status: "idea",
    title: "",
    scripts: { english: "" },
    platforms:
      type === "long"
        ? { youtube: { description: "", tags: [] } }
        : { instagram: { caption: "" } },
    notes: "",
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}
