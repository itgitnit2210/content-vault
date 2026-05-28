import { z } from "zod";

export const videoTypeSchema = z.enum(["long", "short"]);

export const videoStatusSchema = z.enum([
  "idea",
  "drafting",
  "ready",
  "recorded",
  "edited",
  "scheduled",
  "published",
]);

export const platformContentSchema = z.object({
  caption: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
});

export const videoSchema = z.object({
  id: z.string(),
  type: videoTypeSchema,
  status: videoStatusSchema,
  title: z.string(),
  scripts: z.record(z.string(), z.string()),
  scriptHighlights: z
    .record(
      z.string(),
      z.array(
        z.object({
          start: z.number(),
          end: z.number(),
          text: z.string(),
          color: z.enum(["yellow", "green"]).optional(),
        })
      )
    )
    .optional(),
  thumbnailId: z.string().optional(),
  platforms: z.object({
    youtube: platformContentSchema.optional(),
    instagram: platformContentSchema.optional(),
    tiktok: platformContentSchema.optional(),
  }),
  notes: z.string(),
  tags: z.array(z.string()),
  channels: z.array(z.string()).default([]),
  order: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  versions: z.array(z.any()).optional(),
});

export const ideaSchema = z.object({
  id: z.string(),
  type: z.enum(["long", "short"]),
  title: z.string(),
  channels: z.array(z.string()),
  notes: z.string().optional(),
  order: z.number(),
  done: z.boolean().optional(),
  doneAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const promptSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settingsSchema = z.object({
  channels: z.array(z.string()),
});

/** v1: videos only (legacy) */
export const backupSchemaV1 = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  videos: z.array(videoSchema),
});

/** v2: videos + ideas + prompts + settings */
export const backupSchemaV2 = z.object({
  version: z.literal(2),
  exportedAt: z.string(),
  videos: z.array(videoSchema),
  ideas: z.array(ideaSchema).default([]),
  prompts: z.array(promptSchema).default([]),
  settings: settingsSchema.optional(),
});

export type BackupFileV1 = z.infer<typeof backupSchemaV1>;
export type BackupFileV2 = z.infer<typeof backupSchemaV2>;

/** Kept for any callers still importing the legacy name */
export const backupSchema = backupSchemaV1;
