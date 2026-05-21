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
  thumbnailId: z.string().optional(),
  platforms: z.object({
    youtube: platformContentSchema.optional(),
    instagram: platformContentSchema.optional(),
    tiktok: platformContentSchema.optional(),
  }),
  notes: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  versions: z.array(z.any()).optional(),
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  videos: z.array(videoSchema),
});

export type BackupFile = z.infer<typeof backupSchema>;
