"use client";

import { useEffect } from "react";
import type { VideoStatus, VideoType } from "@/types/video";
import { VIDEO_STATUSES } from "@/types/video";
import { useSettingsStore } from "@/lib/hooks/useSettingsStore";

export interface Filters {
  search: string;
  type: VideoType | "all";
  status: VideoStatus | "all";
  channel: string | "all";
}

export function FilterBar({
  filters,
  setFilters,
  total,
  showing,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  total: number;
  showing: number;
}) {
  const { settings, loaded, load } = useSettingsStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-rule pb-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            placeholder="Search title, tags, script…"
            className="field pl-6"
          />
          <span className="pointer-events-none absolute left-0 top-2 font-mono text-xs text-ash">
            /
          </span>
        </div>

        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash md:ml-auto">
          {showing} of {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="label">Type</span>
          {(["all", "long", "short"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilters({ ...filters, type: t })}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                filters.type === t
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="label">Status</span>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as VideoStatus | "all",
              })
            }
            className="border border-rule bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink focus:border-ink focus:outline-none"
          >
            <option value="all">all</option>
            {VIDEO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loaded && settings.channels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="label">Channel</span>
            <button
              onClick={() => setFilters({ ...filters, channel: "all" })}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                filters.channel === "all"
                  ? "border-b border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              all
            </button>
            {settings.channels.map((c) => (
              <button
                key={c}
                onClick={() => setFilters({ ...filters, channel: c })}
                className={`font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                  filters.channel === c
                    ? "border-b border-ink text-ink"
                    : "text-ash hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
