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
    return JSON.parse(raw) as Idea[];
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
}

export const useIdeasStore = create<IdeasStore>((set, get) => ({
  ideas: [],
  loaded: false,

  load: () => {
    const ideas = readIdeas();
    ideas.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    set({ ideas, loaded: true });
  },

  create: (type, title = "", channels = []) => {
    const now = new Date().toISOString();
    const idea: Idea = {
      id: nanoid(10),
      type,
      title,
      channels,
      createdAt: now,
      updatedAt: now,
    };
    const next = [idea, ...get().ideas];
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
    const next = get().ideas.filter((i) => i.id !== id);
    writeIdeas(next);
    set({ ideas: next });
  },
}));
