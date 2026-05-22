"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Prompt } from "@/types/extras";

const PROMPTS_KEY = "content-vault:prompts:v1";

function readPrompts(): Prompt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Prompt[];
  } catch {
    return [];
  }
}

function writePrompts(prompts: Prompt[]) {
  try {
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
  } catch (err) {
    // Could fail if prompt bodies are massive. Surface to user.
    console.error("Failed to write prompts", err);
    alert(
      "Couldn't save prompt — storage is full. Try shortening your prompts or export a backup."
    );
  }
}

interface PromptsStore {
  prompts: Prompt[];
  loaded: boolean;
  load: () => void;
  create: () => string;
  update: (id: string, patch: Partial<Omit<Prompt, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
}

export const usePromptsStore = create<PromptsStore>((set, get) => ({
  prompts: [],
  loaded: false,

  load: () => {
    const prompts = readPrompts();
    prompts.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    set({ prompts, loaded: true });
  },

  create: () => {
    const now = new Date().toISOString();
    const prompt: Prompt = {
      id: nanoid(10),
      title: "",
      body: "",
      createdAt: now,
      updatedAt: now,
    };
    const next = [prompt, ...get().prompts];
    writePrompts(next);
    set({ prompts: next });
    return prompt.id;
  },

  update: (id, patch) => {
    const next = get().prompts.map((p) =>
      p.id === id
        ? { ...p, ...patch, updatedAt: new Date().toISOString() }
        : p
    );
    writePrompts(next);
    set({ prompts: next });
  },

  remove: (id) => {
    const next = get().prompts.filter((p) => p.id !== id);
    writePrompts(next);
    set({ prompts: next });
  },
}));
