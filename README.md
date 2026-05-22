# Content Vault

A personal workshop for video ideas. Scripts, captions, thumbnails, YouTube tags — one place per video, all in the browser.

## What it is, and what it isn't

It **is** a single-user, single-device productivity tool that runs entirely in your browser. No backend, no account, no telemetry.

It **isn't** a sync service. Your data lives in this browser, on this device. **Export backups regularly.** If you clear site data or switch devices without exporting, your videos are gone.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v3
- IndexedDB (via `idb-keyval`) for thumbnails and full video records
- localStorage for the lightweight dashboard index
- Zustand for state, react-hook-form not used (form is controlled), Zod for backup validation

## Why this storage split?

LocalStorage maxes out around 5 MB and is synchronous. Storing base64 thumbnails there would brick the app at ~10 videos.

So:

- **IndexedDB** holds the full `Video` record (scripts, captions, etc.) and thumbnails as `Blob`s.
- **localStorage** holds only a slim "index" — id, title, type, status, last-updated, tags preview, script preview — so the dashboard loads synchronously and feels instant.

If the index ever desyncs from IndexedDB, run `rebuildIndex()` from `lib/storage/backup.ts` in the browser console.

## Running in Codespaces

Open the repo in a Codespace. The devcontainer runs `npm install` automatically.

```bash
npm run dev
```

The port forwarder opens a preview window on port 3000.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import the repo in the Vercel dashboard. Build settings auto-detect: framework Next.js, build `npm run build`, output `.next`. No env vars needed.

## Data model

See `types/video.ts`. The shape is:

```ts
{
  id, type, status, title,
  scripts: { english: "...", hindi: "...", ... },  // any languages you want
  platforms: { youtube: {...}, instagram: {...}, tiktok: {...} },
  thumbnailId,  // pointer to IndexedDB blob
  notes, tags,
  createdAt, updatedAt,
  versions   // last 3 manual snapshots
}
```

## Backup format

Export produces a JSON file with all videos and their thumbnails inlined as base64 data URLs. Import validates with Zod and skips IDs that already exist. Always download a backup before:

- Clearing browser data
- Switching browsers/devices
- Doing anything you might regret

## Known limitations

- Single-device only. No sync.
- Concurrent edits in two tabs trigger a warning, but last-write-wins.
- No real undo — use the manual "save version snapshot" button before risky edits.
- IndexedDB quota is browser-dependent but typically generous (hundreds of MB to GBs).

## File map

```
app/
  layout.tsx               root layout, fonts
  page.tsx                 dashboard
  globals.css              tailwind + base styles
  videos/[id]/page.tsx     edit page
components/
  dashboard/
    VideoCard.tsx
    FilterBar.tsx
  editor/
    VideoForm.tsx          main editor
    ScriptEditor.tsx       tabbed multi-language script editor
    PlatformPanel.tsx      YouTube/IG/TikTok panel
    ThumbnailUploader.tsx
    TagsInput.tsx
  ui/
    PageShell.tsx
    StatusBadge.tsx
    ConfirmDialog.tsx
lib/
  storage/
    blobs.ts               IndexedDB wrapper
    index.ts               localStorage index
    backup.ts              export/import
  hooks/
    useVideoStore.ts       zustand store + CRUD
    useDebouncedEffect.ts  autosave debouncer
    useThumbnailUrl.ts     blob URL lifecycle
  validation.ts            zod schemas
types/
  video.ts
```