export interface Idea {
  id: string;
  type: "long" | "short";
  title: string;
  channels: string[];
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  body: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  channels: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  channels: ["nofluffreports", "nofluffsystems"],
};
