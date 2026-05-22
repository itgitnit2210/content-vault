"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/hooks/useSettingsStore";

export function ChannelMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { settings, loaded, load } = useSettingsStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const toggle = (channel: string) => {
    if (selected.includes(channel)) {
      onChange(selected.filter((c) => c !== channel));
    } else {
      onChange([...selected, channel]);
    }
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {settings.channels.map((channel) => {
        const active = selected.includes(channel);
        return (
          <button
            key={channel}
            type="button"
            onClick={() => toggle(channel)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              active
                ? "border-ink bg-ink text-paper"
                : "border-rule text-ash hover:border-ink hover:text-ink"
            }`}
          >
            {active && "✓ "}
            {channel}
          </button>
        );
      })}
      {settings.channels.length === 0 && (
        <span className="text-xs text-ash">
          No channels yet. Add some in Settings.
        </span>
      )}
    </div>
  );
}
