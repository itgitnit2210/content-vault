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
    if (!Array.isArray(parsed)) return [];

    // Heal stale/duplicate/missing order values.
    // Sort by existing order (treating missing as Infinity = end of list),
    // then assign clean sequential numbers.
    const healed = [...parsed]
      .sort((a, b) => {
        const ao = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        // Tie-break by updatedAt descending so newer items rank higher
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      })
      .map((idea, i) => ({ ...idea, order: i }));

    // Only write back if anything actually changed
    const changed =
      healed.length !== parsed.length ||
      healed.some((h, i) => h.order !== parsed[i]?.order);
    if (changed) writeIdeas(healed);

    return healed;
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
 * Recompute order values so they're a clean 0,1,2,... sequence based on
 * current array position (not stored order). Caller is responsible for
 * arranging the array in the desired order before passing it in.
 */
function normalizeOrder(ideas: Idea[]): Idea[] {
  return ideas.map((idea, i) => ({ ...idea, order: i }));
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
    // readIdeas() already returns a healed, order-sorted array
    set({ ideas: readIdeas(), loaded: true });
  },

  create: (type, title = "", channels = []) => {
    const now = new Date().toISOString();
    const newIdea: Idea = {
      id: nanoid(10),
      type,
      title,
      channels,
      order: 0, // will be set by normalizeOrder
      createdAt: now,
      updatedAt: now,
    };
    // New ideas go to the top of the list
    const next = normalizeOrder([newIdea, ...get().ideas]);
    writeIdeas(next);
    set({ ideas: next });
    return newIdea.id;
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
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    // Swap positions in the array
    [ideas[idx - 1], ideas[idx]] = [ideas[idx], ideas[idx - 1]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveDown: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= ideas.length - 1) return;
    [ideas[idx], ideas[idx + 1]] = [ideas[idx + 1], ideas[idx]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveToTop: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const [target] = ideas.splice(idx, 1);
    ideas.unshift(target);
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveToBottom: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= ideas.length - 1) return;
    const [target] = ideas.splice(idx, 1);
    ideas.push(target);
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },
}));
