"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Idea } from "@/types/extras";

const IDEAS_KEY = "content-vault:ideas:v1";

function readIdeas(): Idea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IDEAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Idea[];
    // Migration: older ideas may not have an `order` field. Assign by current array position.
    let needsMigration = false;
    const migrated = parsed.map((idea, i) => {
      if (typeof idea.order !== "number") {
        needsMigration = true;
        return { ...idea, order: i };
      }
      return idea;
    });
    if (needsMigration) writeIdeas(migrated);
    return migrated;
  } catch {
    return [];
  }
}

function writeIdeas(ideas: Idea[]) {
  try {
    localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
  } catch (err) {
    console.error("Failed to write ideas", err);
  }
}

/**
 * Recompute order values so they're a clean 0,1,2,... sequence.
 * Run after every reorder to keep numbers from drifting into the millions.
 */
function normalizeOrder(ideas: Idea[]): Idea[] {
  return [...ideas]
    .sort((a, b) => a.order - b.order)
    .map((idea, i) => ({ ...idea, order: i }));
}

interface IdeasStore {
  ideas: Idea[];
  loaded: boolean;
  load: () => void;
  create: (
    type: "long" | "short",
    title?: string,
    channels?: string[]
  ) => string;
  update: (id: string, patch: Partial<Omit<Idea, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  moveToTop: (id: string) => void;
  moveToBottom: (id: string) => void;
}

export const useIdeasStore = create<IdeasStore>((set, get) => ({
  ideas: [],
  loaded: false,

  load: () => {
    const ideas = readIdeas();
    ideas.sort((a, b) => a.order - b.order);
    set({ ideas, loaded: true });
  },

  create: (type, title = "", channels = []) => {
    const now = new Date().toISOString();
    // New ideas go to the top (order = -1, then normalize)
    const idea: Idea = {
      id: nanoid(10),
      type,
      title,
      channels,
      order: -1,
      createdAt: now,
      updatedAt: now,
    };
    const next = normalizeOrder([idea, ...get().ideas]);
    writeIdeas(next);
    set({ ideas: next });
    return idea.id;
  },

  update: (id, patch) => {
    const next = get().ideas.map((i) =>
      i.id === id
        ? { ...i, ...patch, updatedAt: new Date().toISOString() }
        : i
    );
    writeIdeas(next);
    set({ ideas: next });
  },

  remove: (id) => {
    const next = normalizeOrder(get().ideas.filter((i) => i.id !== id));
    writeIdeas(next);
    set({ ideas: next });
  },

  moveUp: (id) => {
    const ideas = [...get().ideas].sort((a, b) => a.order - b.order);
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    [ideas[idx - 1], ideas[idx]] = [ideas[idx], ideas[idx - 1]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveDown: (id) => {
    const ideas = [...get().ideas].sort((a, b) => a.order - b.order);
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= ideas.length - 1) return;
    [ideas[idx], ideas[idx + 1]] = [ideas[idx + 1], ideas[idx]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveToTop: (id) => {
    const target = get().ideas.find((i) => i.id === id);
    if (!target) return;
    const others = get().ideas.filter((i) => i.id !== id);
    const next = normalizeOrder([{ ...target, order: -1 }, ...others]);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveToBottom: (id) => {
    const target = get().ideas.find((i) => i.id === id);
    if (!target) return;
    const others = get().ideas.filter((i) => i.id !== id);
    const next = normalizeOrder([
      ...others,
      { ...target, order: Number.MAX_SAFE_INTEGER },
    ]);
    writeIdeas(next);
    set({ ideas: next });
  },
}));
