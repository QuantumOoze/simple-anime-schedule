import { useEffect, useMemo, useState } from "react";
import { AirTypeFilter } from "./components/AirTypeFilter";
import { DaySelector } from "./components/DaySelector";
import { FollowedList } from "./components/FollowedList";
import { HelpPanel } from "./components/HelpPanel";
import { ScheduleList } from "./components/ScheduleList";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAiringSchedule } from "./hooks/useAiringSchedule";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type {
  AiringItem,
  AirType,
  CompletedShowItem,
  FollowedAnime,
  ReleaseReminder,
  UserTrackingState,
  WatchingItem,
} from "./types";
import { formatScheduleTime } from "./utils/date";
import { episodeKey } from "./utils/tracking";

const TRACKING_STORAGE_KEY = "anikai-schedule-tracking";
const NOTIFICATION_PERMISSION_PROMPT_KEY = "anime-schedule-notification-permission-asked";

const DEFAULT_TRACKING_STATE: UserTrackingState = {
  following: {},
  watchingList: {},
  completedShows: {},
  releaseReminders: {},
  watchedEpisodes: {},
  airType: "ALL",
};

type HeaderPanel = "help" | "settings" | null;

function App() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleStartDate, setVisibleStartDate] = useState(() => new Date());
  const [selectedWatchingId, setSelectedWatchingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [openHeaderPanel, setOpenHeaderPanel] = useState<HeaderPanel>(null);
  const [trackingState, setTrackingState] = useLocalStorage<UserTrackingState>(
    TRACKING_STORAGE_KEY,
    DEFAULT_TRACKING_STATE,
  );
  const airType = trackingState.airType ?? "ALL";
  const { items, isLoading, error } = useAiringSchedule(selectedDate, airType);
  const safeTrackingState = useMemo(() => withTrackingDefaults(trackingState, items), [items, trackingState]);
  const followedItems = useMemo(
    () => getSortedWatchingItems(safeTrackingState.watchingList),
    [safeTrackingState.watchingList],
  );
  const followedAnimeIds = useMemo(
    () => Object.values(safeTrackingState.following).map((item) => item.mediaId),
    [safeTrackingState.following],
  );
  const completedAnimeIds = useMemo(
    () => Object.values(safeTrackingState.completedShows).map((item) => item.mediaId),
    [safeTrackingState.completedShows],
  );
  const reminderIds = useMemo(() => new Set(Object.keys(safeTrackingState.releaseReminders)), [
    safeTrackingState.releaseReminders,
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTrackingState((current) => {
        const safeCurrent = withTrackingDefaults(current);
        const nowUnix = Math.floor(Date.now() / 1000);
        let changed = false;
        const nextReminders = { ...safeCurrent.releaseReminders };

        for (const reminder of Object.values(nextReminders)) {
          if (reminder.notified || reminder.airingAt > nowUnix) {
            continue;
          }

          if ("Notification" in window && window.Notification.permission === "granted") {
            new window.Notification("Anime release reminder", {
              body: `${reminder.displayTitle} EP ${reminder.episode} is airing now.`,
            });
          }

          nextReminders[reminder.id] = { ...reminder, notified: true };
          changed = true;
        }

        return changed ? { ...safeCurrent, releaseReminders: nextReminders } : current;
      });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [setTrackingState]);

  const selectedDayHeading = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    [selectedDate],
  );

  function handleAirTypeChange(nextAirType: AirType) {
    setTrackingState((current) => ({ ...withTrackingDefaults(current), airType: nextAirType }));
  }

  function goToToday() {
    const today = new Date();
    setSelectedDate(today);
    setVisibleStartDate(today);
  }

  function handleToggleFollowed(item: AiringItem) {
    const followKey = getFollowKey(item.animeId);

    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const isFollowed = Boolean(safeCurrent.following[followKey]);
      const nextFollowing = { ...safeCurrent.following };
      const nextWatchingList = { ...safeCurrent.watchingList };
      const nextCompletedShows = { ...safeCurrent.completedShows };

      if (isFollowed) {
        delete nextFollowing[followKey];
        delete nextWatchingList[followKey];
      } else {
        const trackedItem: WatchingItem = {
          id: followKey,
          provider: "anilist",
          mediaId: item.animeId,
          displayTitle: item.title,
        };
        nextFollowing[followKey] = trackedItem;
        nextWatchingList[followKey] = trackedItem;
        delete nextCompletedShows[followKey];
      }

      return {
        ...safeCurrent,
        following: nextFollowing,
        watchingList: nextWatchingList,
        completedShows: nextCompletedShows,
        followedAnimeIds: Object.values(nextFollowing).map((followedItem) => followedItem.mediaId),
      };
    });

    setSelectedWatchingId((currentId) => (currentId === followKey ? null : currentId));
  }

  function handleRemoveWatchingItem(id: string) {
    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current, items);
      const nextWatchingList = { ...safeCurrent.watchingList };
      delete nextWatchingList[id];

      return {
        ...safeCurrent,
        watchingList: nextWatchingList,
      };
    });

    setSelectedWatchingId((currentId) => (currentId === id ? null : currentId));
  }

  function handleCompleteWatchingItem(item: WatchingItem) {
    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current, items);
      const nextWatchingList = { ...safeCurrent.watchingList };
      const nextFollowing = { ...safeCurrent.following };
      const nextCompletedShows = { ...safeCurrent.completedShows };

      delete nextWatchingList[item.id];
      delete nextFollowing[item.id];
      nextCompletedShows[item.id] = {
        ...item,
        completedAt: new Date().toISOString(),
      };

      return {
        ...safeCurrent,
        following: nextFollowing,
        watchingList: nextWatchingList,
        completedShows: nextCompletedShows,
        followedAnimeIds: Object.values(nextFollowing).map((followedItem) => followedItem.mediaId),
      };
    });

    setSelectedWatchingId(null);
  }

  function handleToggleWatched(animeId: number, episode: number) {
    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const key = episodeKey(animeId, episode);

      return {
        ...safeCurrent,
        watchedEpisodes: {
          ...safeCurrent.watchedEpisodes,
          [key]: !safeCurrent.watchedEpisodes[key],
        },
      };
    });
  }

  async function handleToggleReleaseReminder(item: AiringItem) {
    if (item.airingAt <= Math.floor(Date.now() / 1000)) {
      return;
    }

    const reminderId = getReminderKey(item);

    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const nextReminders = { ...safeCurrent.releaseReminders };

      if (nextReminders[reminderId]) {
        delete nextReminders[reminderId];
      } else {
        nextReminders[reminderId] = {
          id: reminderId,
          provider: "anilist",
          mediaId: item.animeId,
          episode: item.episode,
          displayTitle: item.title,
          airingAt: item.airingAt,
          localTime: formatScheduleTime(item.airingAt),
          createdAt: new Date().toISOString(),
        };
      }

      return { ...safeCurrent, releaseReminders: nextReminders };
    });

    if ("Notification" in window && window.Notification.permission === "default" && shouldRequestNotificationPermission()) {
      window.localStorage.setItem(NOTIFICATION_PERMISSION_PROMPT_KEY, "true");
      await window.Notification.requestPermission().catch(() => "default");
    }
  }

  function handleExportData() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: safeTrackingState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simple-anime-schedule-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setImportStatus("Exported app data.");
  }

  async function handleImportData(file: File) {
    try {
      const rawText = await file.text();
      const parsed = safeParseJson(rawText);

      if (!parsed || typeof parsed !== "object") {
        setImportStatus("Import failed: JSON must contain an object.");
        return;
      }

      const candidate = "data" in parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
      const nextState = withTrackingDefaults(candidate as UserTrackingState, items);
      setTrackingState(nextState);
      setSelectedWatchingId(null);
      setImportStatus("Imported app data.");
    } catch {
      setImportStatus("Import failed: invalid JSON file.");
    }
  }

  function handleClearWatchedEpisodes() {
    setTrackingState((current) => ({ ...withTrackingDefaults(current, items), watchedEpisodes: {} }));
  }

  function handleClearReminders() {
    setTrackingState((current) => ({ ...withTrackingDefaults(current, items), releaseReminders: {} }));
  }

  function handleClearWatchingList() {
    setTrackingState((current) => ({ ...withTrackingDefaults(current, items), watchingList: {} }));
    setSelectedWatchingId(null);
  }

  function handleClearCompletedShows() {
    setTrackingState((current) => ({ ...withTrackingDefaults(current, items), completedShows: {} }));
  }

  function handleResetAllData() {
    if (!window.confirm("Reset all app data? This clears watched episodes, watching list, completed shows, and reminders.")) {
      return;
    }

    setTrackingState(DEFAULT_TRACKING_STATE);
    setSelectedWatchingId(null);
    window.localStorage.removeItem(NOTIFICATION_PERMISSION_PROMPT_KEY);
    setImportStatus("Reset all app data.");
  }

  return (
    <main className="min-h-screen bg-night-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full justify-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex w-full max-w-[360px] flex-col gap-4 lg:w-fit lg:max-w-none lg:flex-row lg:items-start">
          <div className="relative mx-auto flex w-full max-w-[360px] shrink-0 flex-col lg:mx-0 lg:w-[360px]">
            <header className="relative z-40 mb-4 bg-night-950 pb-1">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="cursor-pointer text-left text-2xl font-black tracking-normal text-white transition hover:text-signal-gold/95 focus-visible:text-signal-gold/95 focus-visible:outline-none"
                  >
                    Simple Anime Schedule
                  </button>
                </div>
                <p className="pb-1 text-right text-xs font-semibold text-slate-500">{selectedDayHeading}</p>
              </div>
            </header>

            <section className="sticky top-0 z-40 -mx-3 border-b border-white/[0.06] bg-night-950 px-3 pb-3 pt-1 shadow-[0_14px_20px_rgba(7,9,13,0.85)]">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[0.68rem] font-medium leading-snug text-slate-500">
                  Schedule source: AniList airing data - times shown in your local timezone.
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <HelpPanel
                    isOpen={openHeaderPanel === "help"}
                    onOpenChange={(isOpen) => setOpenHeaderPanel(isOpen ? "help" : null)}
                  />
                  <SettingsPanel
                    isOpen={openHeaderPanel === "settings"}
                    importStatus={importStatus}
                    onOpenChange={(isOpen) => setOpenHeaderPanel(isOpen ? "settings" : null)}
                    onClearCompletedShows={handleClearCompletedShows}
                    onClearReminders={handleClearReminders}
                    onClearWatchedEpisodes={handleClearWatchedEpisodes}
                    onClearWatchingList={handleClearWatchingList}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    onResetAllData={handleResetAllData}
                  />
                </div>
              </div>
              <DaySelector
                selectedDate={selectedDate}
                visibleStartDate={visibleStartDate}
                onSelectDate={setSelectedDate}
                onVisibleStartDateChange={setVisibleStartDate}
              />
              <div className="mt-3">
                <AirTypeFilter selectedAirType={airType} onChange={handleAirTypeChange} />
              </div>
            </section>

            <section className="relative z-0 mt-4 flex-1">
              <ScheduleList
                selectedDate={selectedDate}
                items={items}
                isLoading={isLoading}
                error={error}
                followedAnimeIds={followedAnimeIds}
                completedAnimeIds={completedAnimeIds}
                reminderIds={reminderIds}
                watchedEpisodes={safeTrackingState.watchedEpisodes}
                onToggleFollowed={handleToggleFollowed}
                onToggleWatched={handleToggleWatched}
                onToggleReleaseReminder={handleToggleReleaseReminder}
              />
            </section>
          </div>

          <div className="mx-auto w-full max-w-[360px] shrink-0 lg:sticky lg:top-36 lg:mx-0 lg:mt-[8.25rem] lg:w-36">
            <FollowedList
              followedItems={followedItems}
              selectedWatchingId={selectedWatchingId}
              onSelectWatchingItem={setSelectedWatchingId}
              onClearSelectedWatchingItem={() => setSelectedWatchingId(null)}
              onRemoveWatchingItem={handleRemoveWatchingItem}
              onCompleteWatchingItem={handleCompleteWatchingItem}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function withTrackingDefaults(value: UserTrackingState, loadedItems: AiringItem[] = []): UserTrackingState {
  const safeValue = value && typeof value === "object" ? value : DEFAULT_TRACKING_STATE;
  const legacyFollowedIds = Array.isArray(safeValue.followedAnimeIds)
    ? safeValue.followedAnimeIds.filter(isValidMediaId)
    : [];
  const loadedTitles = new Map<number | string, string>(loadedItems.map((item) => [item.animeId, item.title]));
  const hasStoredWatchingList = Boolean(safeValue.watchingList && typeof safeValue.watchingList === "object");
  const rawWatchingList = hasStoredWatchingList ? (safeValue.watchingList as Record<string, unknown>) : {};
  const hasLegacyWatchingListEntries =
    hasStoredWatchingList && Object.values(rawWatchingList).some((rawItem) => rawItem === true);
  const following = normalizeFollowing(safeValue.following, loadedTitles);
  const watchingList = normalizeWatchingList(safeValue.watchingList, loadedTitles);
  const completedShows = normalizeCompletedShows(safeValue.completedShows, loadedTitles);
  const releaseReminders = normalizeReleaseReminders(safeValue.releaseReminders);

  for (const animeId of legacyFollowedIds) {
    const followKey = getFollowKey(animeId);

    if (!following[followKey]) {
      const displayTitle = loadedTitles.get(animeId);

      following[followKey] = {
        id: followKey,
        provider: "anilist",
        mediaId: animeId,
        ...(displayTitle ? { displayTitle } : {}),
      };
    }
  }

  if (!hasStoredWatchingList) {
    for (const item of Object.values(following)) {
      if (item.displayTitle && !watchingList[item.id]) {
        watchingList[item.id] = {
          id: item.id,
          provider: item.provider,
          mediaId: item.mediaId,
          displayTitle: item.displayTitle,
        };
      }
    }
  }

  if (hasLegacyWatchingListEntries) {
    Object.entries(rawWatchingList).forEach(([key, rawItem]) => {
      if (rawItem !== true) {
        return;
      }

      const animeId = Number(key.replace("anilist:", ""));
      const displayTitle = loadedTitles.get(animeId);

      if (Number.isFinite(animeId) && displayTitle && !watchingList[getFollowKey(animeId)]) {
        watchingList[getFollowKey(animeId)] = {
          id: getFollowKey(animeId),
          provider: "anilist",
          mediaId: animeId,
          displayTitle,
        };
      }
    });
  }

  return {
    followedAnimeIds: Object.values(following).map((item) => item.mediaId),
    following,
    watchingList,
    completedShows,
    releaseReminders,
    watchedEpisodes: normalizeWatchedEpisodes(safeValue.watchedEpisodes),
    airType: isAirType(safeValue.airType) ? safeValue.airType : "ALL",
  };
}

function normalizeWatchedEpisodes(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, watched]) => typeof key === "string" && typeof watched === "boolean" && key.includes(":"),
    ),
  );
}

function isAirType(value: unknown): value is AirType {
  return value === "RAW" || value === "SUB" || value === "DUB" || value === "ALL";
}

function normalizeFollowing(value: unknown, loadedTitles: Map<number | string, string>): Record<string, FollowedAnime> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawItem]) => {
      if (rawItem === true) {
        const animeId = Number(key.replace("anilist:", ""));

        if (!Number.isFinite(animeId)) {
          return [];
        }

        return [
          [
            getFollowKey(animeId),
            {
              id: getFollowKey(animeId),
              provider: "anilist",
              mediaId: animeId,
              ...(loadedTitles.get(animeId) ? { displayTitle: loadedTitles.get(animeId) } : {}),
            },
          ],
        ];
      }

      if (!rawItem || typeof rawItem !== "object") {
        return [];
      }

      const item = rawItem as Partial<FollowedAnime>;

      if (item.provider !== "anilist" || !isValidMediaId(item.mediaId)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id : key;
      const storedTitle =
        typeof item.displayTitle === "string" && !isPlaceholderTitle(item.displayTitle) ? item.displayTitle : undefined;
      const displayTitle = storedTitle ?? loadedTitles.get(item.mediaId);

      return [
        [
          id,
          {
            id,
            provider: "anilist",
            mediaId: item.mediaId,
            ...(displayTitle ? { displayTitle } : {}),
          },
        ],
      ];
    }),
  );
}

function normalizeWatchingList(value: unknown, loadedTitles: Map<number | string, string>): Record<string, WatchingItem> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawItem]) => {
      if (!rawItem || typeof rawItem !== "object") {
        return [];
      }

      const item = rawItem as Partial<WatchingItem>;

      if (item.provider !== "anilist" || !isValidMediaId(item.mediaId)) {
        return [];
      }

      const storedTitle =
        typeof item.displayTitle === "string" && isRenderableTitle(item.displayTitle) ? item.displayTitle.trim() : undefined;
      const displayTitle = storedTitle ?? loadedTitles.get(item.mediaId);

      if (!displayTitle) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id : key;
      return [[id, { id, provider: "anilist", mediaId: item.mediaId, displayTitle }]];
    }),
  );
}

function normalizeCompletedShows(value: unknown, loadedTitles: Map<number | string, string>): Record<string, CompletedShowItem> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawItem]) => {
      if (!rawItem || typeof rawItem !== "object") {
        return [];
      }

      const item = rawItem as Partial<CompletedShowItem>;

      if (item.provider !== "anilist" || !isValidMediaId(item.mediaId)) {
        return [];
      }

      const storedTitle =
        typeof item.displayTitle === "string" && isRenderableTitle(item.displayTitle) ? item.displayTitle.trim() : undefined;
      const displayTitle = storedTitle ?? loadedTitles.get(item.mediaId);

      if (!displayTitle) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id : key;
      const completedAt = typeof item.completedAt === "string" ? item.completedAt : new Date().toISOString();
      return [[id, { id, provider: "anilist", mediaId: item.mediaId, displayTitle, completedAt }]];
    }),
  );
}

function normalizeReleaseReminders(value: unknown): Record<string, ReleaseReminder> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawItem]) => {
      if (!rawItem || typeof rawItem !== "object") {
        return [];
      }

      const item = rawItem as Partial<ReleaseReminder>;

      if (
        item.provider !== "anilist" ||
        !isValidMediaId(item.mediaId) ||
        typeof item.episode !== "number" ||
        !isRenderableTitle(item.displayTitle) ||
        typeof item.airingAt !== "number"
      ) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id : key;
      return [
        [
          id,
          {
            id,
            provider: "anilist",
            mediaId: item.mediaId,
            episode: item.episode,
            displayTitle: item.displayTitle.trim(),
            airingAt: item.airingAt,
            localTime: typeof item.localTime === "string" ? item.localTime : formatScheduleTime(item.airingAt),
            createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
            notified: Boolean(item.notified),
          },
        ],
      ];
    }),
  );
}

function getSortedWatchingItems(watchingList: Record<string, WatchingItem>) {
  return Object.values(watchingList)
    .filter((item, index, items) => items.findIndex((otherItem) => otherItem.mediaId === item.mediaId) === index)
    .sort((left, right) => left.displayTitle.localeCompare(right.displayTitle, undefined, { sensitivity: "base" }));
}

function getFollowKey(animeId: number | string) {
  return `anilist:${animeId}`;
}

function isPlaceholderTitle(title: string) {
  return /^AniList #\d+$/i.test(title.trim());
}

function isRenderableTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !isPlaceholderTitle(value);
}

function isValidMediaId(value: unknown): value is number | string {
  return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim().length > 0);
}

function getReminderKey(item: AiringItem) {
  return `anilist:${item.animeId}:${item.episode}:${item.airingAt}`;
}

function shouldRequestNotificationPermission() {
  try {
    return window.localStorage.getItem(NOTIFICATION_PERMISSION_PROMPT_KEY) !== "true";
  } catch {
    return true;
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

// TODO: Future completed archive should store completed shows in chronological
// completion order, display them as a clean stacked list, support manual
// add/remove, and use assisted AniList autocomplete instead of typo-prone
// free-text-only archive entries.

export default App;
