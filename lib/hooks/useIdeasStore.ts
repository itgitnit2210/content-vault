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

    // Sort: not-done first (by existing order), then done (by existing order).
    // Within each group, heal missing/duplicate order values.
    const healed = [...parsed]
      .sort((a, b) => {
        const aDone = a.done ? 1 : 0;
        const bDone = b.done ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone; // not-done before done
        const ao = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      })
      .map((idea, i) => ({ ...idea, order: i }));

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

/** Renumber order based on array position. */
function normalizeOrder(ideas: Idea[]): Idea[] {
  return ideas.map((idea, i) => ({ ...idea, order: i }));
}

/** Push done items to the bottom while preserving relative order within each group. */
function sinkDone(ideas: Idea[]): Idea[] {
  const active = ideas.filter((i) => !i.done);
  const done = ideas.filter((i) => i.done);
  return [...active, ...done];
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
  toggleDone: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  moveToTop: (id: string) => void;
  moveToBottom: (id: string) => void;
}

export const useIdeasStore = create<IdeasStore>((set, get) => ({
  ideas: [],
  loaded: false,

  load: () => {
    set({ ideas: readIdeas(), loaded: true });
  },

  create: (type, title = "", channels = []) => {
    const now = new Date().toISOString();
    const newIdea: Idea = {
      id: nanoid(10),
      type,
      title,
      channels,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };
    // New ideas go to the top of the *active* section
    const current = get().ideas;
    const active = current.filter((i) => !i.done);
    const done = current.filter((i) => i.done);
    const next = normalizeOrder([newIdea, ...active, ...done]);
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

  toggleDone: (id) => {
    const now = new Date().toISOString();
    const updated = get().ideas.map((i) =>
      i.id === id
        ? {
            ...i,
            done: !i.done,
            doneAt: !i.done ? now : undefined,
            updatedAt: now,
          }
        : i
    );
    // After toggling, sink done items so the list visually reorganizes
    const next = normalizeOrder(sinkDone(updated));
    writeIdeas(next);
    set({ ideas: next });
  },

  moveUp: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    // Don't allow moving across the done/active boundary
    if (ideas[idx].done !== ideas[idx - 1].done) return;
    [ideas[idx - 1], ideas[idx]] = [ideas[idx], ideas[idx - 1]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveDown: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= ideas.length - 1) return;
    if (ideas[idx].done !== ideas[idx + 1].done) return;
    [ideas[idx], ideas[idx + 1]] = [ideas[idx + 1], ideas[idx]];
    const next = normalizeOrder(ideas);
    writeIdeas(next);
    set({ ideas: next });
  },

  moveToTop: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const target = ideas[idx];
    const rest = ideas.filter((i) => i.id !== id);
    let next: Idea[];
    if (target.done) {
      // Move to top of the done section (i.e. first done item)
      const firstDoneIdx = rest.findIndex((i) => i.done);
      const insertAt = firstDoneIdx === -1 ? rest.length : firstDoneIdx;
      next = [...rest.slice(0, insertAt), target, ...rest.slice(insertAt)];
    } else {
      // Move to absolute top
      next = [target, ...rest];
    }
    const final = normalizeOrder(next);
    writeIdeas(final);
    set({ ideas: final });
  },

  moveToBottom: (id) => {
    const ideas = [...get().ideas];
    const idx = ideas.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const target = ideas[idx];
    const rest = ideas.filter((i) => i.id !== id);
    let next: Idea[];
    if (target.done) {
      // Move to absolute bottom
      next = [...rest, target];
    } else {
      // Move to bottom of active section (just before the first done item)
      const firstDoneIdx = rest.findIndex((i) => i.done);
      const insertAt = firstDoneIdx === -1 ? rest.length : firstDoneIdx;
      next = [...rest.slice(0, insertAt), target, ...rest.slice(insertAt)];
    }
    const final = normalizeOrder(next);
    writeIdeas(final);
    set({ ideas: final });
  },
}));
