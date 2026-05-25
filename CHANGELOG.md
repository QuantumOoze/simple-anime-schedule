# Changelog

## Stable v1 Local Anime Schedule App

- Added compact local data management for export, import, selective clears, and full reset.
- Fixed Watching list hydration so persisted entries restore across reloads and same-origin restarts.
- Updated validation to preserve complete Watching items while still ignoring malformed or legacy raw-key entries.
- Confirmed the production build succeeds for the stable local v1 checkpoint.

## v1 - Stable Anime Schedule Tracker

- Built the initial mobile-first anime schedule tracker.
- Added AniList GraphQL airing schedule data source.
- Added day selection, header-window navigation, and local timezone display.
- Added localStorage-backed watched episodes, currently-watching state, completed state, and release reminders.
- Added Watching side list with quick remove, completion prompt, and alphabetical sorting.
- Added completed-row blue pill styling and custom truncated-title tooltips.
- Added reminder toggles, notification checks while open, and current-release underline states.
- Added basic PWA manifest, icon, and service worker.
- Hardened localStorage parsing, persisted state normalization, and AniList response mapping.
