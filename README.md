# Simple Anime Schedule

A mobile-first anime broadcast schedule tracker. The app shows a chronological list of episode release times for a selected local day, using AniList airing schedule data and browser-local state only.

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- AniList GraphQL
- localStorage for user state
- Basic PWA manifest and service worker

## Run Commands

Install dependencies:

```sh
npm install
```

Start the dev server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

If `npm` is not available on this machine, the workspace-local Node runtime can run commands with:

```powershell
.\.tools\node-v22.16.0-win-x64\npm.cmd run dev
```

## Current Features

- Dark, compact schedule board optimized for narrow mobile layouts.
- Local day selector with separate header-window navigation and selected schedule date.
- AniList airing schedule fetch by Unix timestamp range.
- Local timezone display for release times.
- RAW/SUB/DUB/ALL filter state persisted locally for future provider support.
- EP button toggles currently-watching state and gold schedule highlights.
- Watched eye toggle persists per anime episode.
- Watching side list with alphabetical sorting, quick remove, completion prompt, and click-away cancel.
- Completed shows render as a blue title-and-eye pill in schedule rows.
- Future release time reminder toggles with local browser notifications while the app is open.
- Current release underline on today only, with red connected underline when the current release has an active reminder.
- Custom tooltip for truncated schedule and side-list titles.
- Return-to-today shortcut by clicking the app title.
- Defensive localStorage normalization for malformed or legacy state.

## Known Limitations

- v1 has no backend, account sync, or cross-device persistence.
- AniList provides broadcast-style airing data only; RAW/SUB/DUB-specific data is not available from the current source.
- Browser notifications only work while the app is open; no push notification backend exists in v1.
- Reminder permission and notification behavior may vary by browser and mobile platform.
- Completed archive management is planned but not implemented.
- Schedule accuracy depends on AniList data availability and rate limits.

## Future Roadmap

- Add an alternate schedule source for RAW/SUB/DUB-specific release metadata.
- Add a completed archive sorted by completion date.
- Support manual archive add/remove with AniList-assisted autocomplete.
- Add better reminder management and cleanup for old reminders.
- Consider service-worker-backed notification support if a reliable v2 architecture is added.
- Add focused tests around storage migration, schedule mapping, and interaction state.
