"use client";

import { create } from "zustand";
import type { AppSettings } from "@/types/extras";
import { DEFAULT_SETTINGS } from "@/types/extras";

const SETTINGS_KEY = "content-vault:settings:v1";

function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as AppSettings;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      channels:
        Array.isArray(parsed.channels) && parsed.channels.length > 0
          ? parsed.channels
          : DEFAULT_SETTINGS.channels,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(s: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (err) {
    console.error("Failed to write settings", err);
  }
}

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  load: () => void;
  addChannel: (name: string) => void;
  renameChannel: (oldName: string, newName: string) => void;
  removeChannel: (name: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: () => {
    set({ settings: readSettings(), loaded: true });
  },

  addChannel: (name) => {
    const clean = name.trim();
    if (!clean) return;
    const { settings } = get();
    if (settings.channels.includes(clean)) return;
    const next = { ...settings, channels: [...settings.channels, clean] };
    writeSettings(next);
    set({ settings: next });
  },

  renameChannel: (oldName, newName) => {
    const clean = newName.trim();
    if (!clean || clean === oldName) return;
    const { settings } = get();
    const next = {
      ...settings,
      channels: settings.channels.map((c) => (c === oldName ? clean : c)),
    };
    writeSettings(next);
    set({ settings: next });
  },

  removeChannel: (name) => {
    const { settings } = get();
    if (settings.channels.length <= 1) {
      alert("Keep at least one channel.");
      return;
    }
    const next = {
      ...settings,
      channels: settings.channels.filter((c) => c !== name),
    };
    writeSettings(next);
    set({ settings: next });
  },
}));
