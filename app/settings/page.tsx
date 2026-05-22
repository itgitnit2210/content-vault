"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/lib/hooks/useSettingsStore";
import { PageShell } from "@/components/ui/PageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function SettingsPage() {
  const { settings, loaded, load, addChannel, renameChannel, removeChannel } =
    useSettingsStore();
  const [newChannel, setNewChannel] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = () => {
    const clean = newChannel.trim();
    if (!clean) return;
    if (settings.channels.includes(clean)) {
      alert("That channel already exists.");
      return;
    }
    addChannel(clean);
    setNewChannel("");
  };

  const handleRename = (oldName: string) => {
    const clean = editValue.trim();
    if (!clean || clean === oldName) {
      setEditing(null);
      return;
    }
    renameChannel(oldName, clean);
    setEditing(null);
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Channels you publish to. These show up as filters and selectors throughout the app."
    >
      <section className="max-w-xl space-y-6">
        <div>
          <h2 className="font-display text-2xl font-medium">Channels</h2>
          <p className="mt-2 text-sm text-ash">
            Renaming a channel here does not retroactively update videos already
            tagged with the old name. Add carefully.
          </p>
        </div>

        {!loaded ? (
          <p className="text-ash">Loading…</p>
        ) : (
          <>
            <ul className="divide-y divide-rule border-y border-rule">
              {settings.channels.map((channel) => (
                <li
                  key={channel}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  {editing === channel ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRename(channel)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(channel);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="field"
                    />
                  ) : (
                    <span className="font-mono text-sm">{channel}</span>
                  )}
                  <div className="flex shrink-0 gap-2">
                    {editing === channel ? (
                      <button
                        onClick={() => handleRename(channel)}
                        className="btn-ghost"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(channel);
                          setEditValue(channel);
                        }}
                        className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash hover:text-ink"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmRemove(channel)}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash hover:text-accent"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                placeholder="add new channel name"
                className="field flex-1"
              />
              <button onClick={handleAdd} className="btn">
                Add
              </button>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove this channel?"
        message={`"${confirmRemove}" will be removed from the dropdown. Existing videos tagged with this channel won't be modified, but the filter will no longer show it.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (confirmRemove) removeChannel(confirmRemove);
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </PageShell>
  );
}
