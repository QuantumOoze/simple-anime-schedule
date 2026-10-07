import { useEffect, useMemo, useRef, useState } from "react";
import { AirTypeFilter } from "./components/AirTypeFilter";
import { DaySelector } from "./components/DaySelector";
import { FollowedList } from "./components/FollowedList";
import { HelpPanel } from "./components/HelpPanel";
import { PendingWatchBadge } from "./components/PendingWatchBadge";
import { ScheduleList } from "./components/ScheduleList";
import { SettingsPanel } from "./components/SettingsPanel";
import { WatchCheckPanel } from "./components/WatchCheckPanel";
import { useAiringSchedule } from "./hooks/useAiringSchedule";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useWatchCheckDiscovery } from "./hooks/useWatchCheckDiscovery";
import { useWatchingMediaMetadata } from "./hooks/useWatchingMediaMetadata";
import {
  reconcileReleaseReminders,
  syncArmedReminder,
  syncCancelledReminder,
  syncClearedReminders,
} from "./utils/releasePush";
import type {
  AiringItem,
  AirType,
  CompletedShowItem,
  FollowedAnime,
  ReleaseReminder,
  UserTrackingState,
  WatchingItem,
  WatchCheck,
} from "./types";
import { formatScheduleTime, getAnimeSeason } from "./utils/date";
import { episodeKey } from "./utils/tracking";
import {
  getActionableWatchCheckGroups,
  removeWatchChecksForMediaId,
  isWatchCheckActionable,
  watchCheckEligibilityTime,
  watchCheckKey,
} from "./utils/watchChecks";
import type { ActionableWatchCheckGroup } from "./utils/watchChecks";

const TRACKING_STORAGE_KEY = "anikai-schedule-tracking";
const NOTIFICATION_PERMISSION_PROMPT_KEY = "anime-schedule-notification-permission-asked";

const DEFAULT_TRACKING_STATE: UserTrackingState = {
  following: {},
  watchingList: {},
  completedShows: {},
  releaseReminders: {},
  watchChecks: {},
  watchCheckInitializedMediaIds: {},
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
  const [watchCheckNow, setWatchCheckNow] = useState(() => Math.floor(Date.now() / 1000));
  const hadActionableWatchChecks = useRef(false);
  const [watchCheckBellAnimationKey, setWatchCheckBellAnimationKey] = useState(0);
  const bellFocusFromPointer = useRef(false);
  const bellAnchorRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const [isBellHovered, setIsBellHovered] = useState(false);
  const [isBellPressed, setIsBellPressed] = useState(false);
  const [isBellFocused, setIsBellFocused] = useState(false);
  const [isWatchCheckPanelOpen, setIsWatchCheckPanelOpen] = useState(false);
  const [isBellRingActive, setIsBellRingActive] = useState(false);
  const [trackingState, setTrackingState] = useLocalStorage<UserTrackingState>(
    TRACKING_STORAGE_KEY,
    DEFAULT_TRACKING_STATE,
  );
  const airType = trackingState.airType ?? "ALL";
  const { items, isLoading, error } = useAiringSchedule(selectedDate, airType);
  const safeTrackingState = useMemo(() => withTrackingDefaults(trackingState, items), [items, trackingState]);
  const releaseRemindersRef = useRef(safeTrackingState.releaseReminders);
  releaseRemindersRef.current = safeTrackingState.releaseReminders;
  useWatchCheckDiscovery({
    watchingList: safeTrackingState.watchingList,
    lastSuccessfulScanAt: safeTrackingState.watchCheckLastSuccessfulScanAt,
    initializedMediaIds: safeTrackingState.watchCheckInitializedMediaIds,
    setTrackingState,
  });
  const followedItems = useMemo(
    () => getSortedWatchingItems(safeTrackingState.watchingList),
    [safeTrackingState.watchingList],
  );
  const watchingMediaMetadata = useWatchingMediaMetadata(followedItems);
  const snoozedWatchingMediaIds = new Set(
    Object.values(safeTrackingState.watchChecks)
      .filter((check) => typeof check.snoozedUntil === "number" && check.snoozedUntil > Math.floor(Date.now() / 1000))
      .map((check) => String(check.mediaId)),
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
  const actionableWatchCheckGroups = useMemo(
    () =>
      getActionableWatchCheckGroups(
        safeTrackingState.watchChecks,
        safeTrackingState.watchedEpisodes,
        safeTrackingState.watchingList,
        watchCheckNow,
      ),
    [safeTrackingState.watchChecks, safeTrackingState.watchedEpisodes, safeTrackingState.watchingList, watchCheckNow],
  );
  const hasActionableWatchChecks = actionableWatchCheckGroups.length > 0;

  useEffect(() => {
    const reconcile = () => {
      void reconcileReleaseReminders(Object.values(releaseRemindersRef.current));
    };

    reconcile();
    window.addEventListener("online", reconcile);
    return () => window.removeEventListener("online", reconcile);
  }, []);

  useEffect(() => {
    let ringTimeout: number | undefined;

    if (hasActionableWatchChecks && !hadActionableWatchChecks.current) {
      setWatchCheckBellAnimationKey((current) => current + 1);
      setIsBellRingActive(true);
      ringTimeout = window.setTimeout(() => setIsBellRingActive(false), 720);
    } else if (!hasActionableWatchChecks) {
      setIsBellRingActive(false);
    }

    hadActionableWatchChecks.current = hasActionableWatchChecks;

    return () => {
      if (ringTimeout !== undefined) {
        window.clearTimeout(ringTimeout);
      }
    };
  }, [hasActionableWatchChecks]);

  useEffect(() => {
    if (!hasActionableWatchChecks) {
      setIsWatchCheckPanelOpen(false);
    }
  }, [hasActionableWatchChecks]);

  const isBellInteracting = isBellHovered || isBellPressed || isBellFocused;
  const bellIsAwake = hasActionableWatchChecks;
  const bellIsWaking = !bellIsAwake && isBellInteracting;
  const bellImageSrc = bellIsAwake
    ? "/watch-check-bell.png"
    : bellIsWaking
      ? "/watch-check-bell-waking.png"
      : "/watch-check-bell-sleeping.png";
  const bellAnimationClass = bellIsAwake
    ? isBellRingActive
      ? "watch-check-bell-ring"
      : "watch-check-bell-idle"
    : bellIsWaking
      ? ""
      : "watch-check-bell-idle";
  const bellAriaLabel = hasActionableWatchChecks
    ? `Open watch reminders, ${actionableWatchCheckGroups.length} pending`
    : "Open watch reminders";
  const logoSrc = actionableWatchCheckGroups.length >= 6
    ? "/simple-anime-schedule-logo-6plus.png"
    : "/simple-anime-schedule-logo.png";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTrackingState((current) => {
        const safeCurrent = withTrackingDefaults(current);
        const nowUnix = Math.floor(Date.now() / 1000);
        setWatchCheckNow(nowUnix);
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
  const selectedSeason = useMemo(() => getAnimeSeason(selectedDate), [selectedDate]);

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
      const nextWatchCheckInitializedMediaIds = { ...safeCurrent.watchCheckInitializedMediaIds };
      let nextWatchChecks = safeCurrent.watchChecks;

      if (isFollowed) {
        delete nextFollowing[followKey];
        delete nextWatchingList[followKey];
        delete nextWatchCheckInitializedMediaIds[String(item.animeId)];
        nextWatchChecks = removeWatchChecksForMediaId(nextWatchChecks, item.animeId);
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
        watchChecks: nextWatchChecks,
        watchCheckInitializedMediaIds: nextWatchCheckInitializedMediaIds,
        followedAnimeIds: Object.values(nextFollowing).map((followedItem) => followedItem.mediaId),
      };
    });

    setSelectedWatchingId((currentId) => (currentId === followKey ? null : currentId));
  }

  function handleRemoveWatchingItem(id: string) {
    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current, items);
      const nextWatchingList = { ...safeCurrent.watchingList };
      const removedItem = nextWatchingList[id];
      delete nextWatchingList[id];
      const nextWatchCheckInitializedMediaIds = { ...safeCurrent.watchCheckInitializedMediaIds };
      if (removedItem) {
        delete nextWatchCheckInitializedMediaIds[String(removedItem.mediaId)];
      }
      const nextWatchChecks = removedItem
        ? removeWatchChecksForMediaId(safeCurrent.watchChecks, removedItem.mediaId)
        : safeCurrent.watchChecks;

      return {
        ...safeCurrent,
        watchingList: nextWatchingList,
        watchChecks: nextWatchChecks,
        watchCheckInitializedMediaIds: nextWatchCheckInitializedMediaIds,
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
      const nextWatchCheckInitializedMediaIds = { ...safeCurrent.watchCheckInitializedMediaIds };
      const nextWatchChecks = removeWatchChecksForMediaId(safeCurrent.watchChecks, item.mediaId);

      delete nextWatchingList[item.id];
      delete nextFollowing[item.id];
      delete nextWatchCheckInitializedMediaIds[String(item.mediaId)];
      nextCompletedShows[item.id] = {
        ...item,
        completedAt: new Date().toISOString(),
      };

      return {
        ...safeCurrent,
        following: nextFollowing,
        watchingList: nextWatchingList,
        completedShows: nextCompletedShows,
        watchChecks: nextWatchChecks,
        watchCheckInitializedMediaIds: nextWatchCheckInitializedMediaIds,
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

  function handleMarkWatchCheckGroupWatched(group: ActionableWatchCheckGroup) {
    const nowUnix = Math.floor(Date.now() / 1000);

    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const watchedEpisodes = { ...safeCurrent.watchedEpisodes };

      for (const check of group.checks) {
        if (isWatchCheckActionable(check, safeCurrent.watchedEpisodes, nowUnix)) {
          watchedEpisodes[episodeKey(check.mediaId, check.episode)] = true;
        }
      }

      return { ...safeCurrent, watchedEpisodes };
    });

    setWatchCheckNow(nowUnix);
  }

  function handleSnoozeWatchCheckGroup(group: ActionableWatchCheckGroup, days: number) {
    const nowUnix = Math.floor(Date.now() / 1000);
    const snoozedUntil = nowUnix + Math.min(30, Math.max(1, days)) * 24 * 60 * 60;
    const groupCheckIds = new Set(group.checks.map((check) => check.id));

    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const watchChecks = Object.fromEntries(
        Object.entries(safeCurrent.watchChecks).map(([key, check]) => {
          if (groupCheckIds.has(check.id) && isWatchCheckActionable(check, safeCurrent.watchedEpisodes, nowUnix)) {
            return [key, { ...check, snoozedUntil }];
          }

          return [key, check];
        }),
      );

      return { ...safeCurrent, watchChecks };
    });

    setWatchCheckNow(nowUnix);
  }

  async function handleToggleReleaseReminder(item: AiringItem) {
    if (item.airingAt <= Math.floor(Date.now() / 1000)) {
      return;
    }

    const reminderId = getReminderKey(item);
    const existingReminder = safeTrackingState.releaseReminders[reminderId];
    const nextReminder: ReleaseReminder = {
      id: reminderId,
      provider: "anilist",
      mediaId: item.animeId,
      episode: item.episode,
      displayTitle: item.title,
      airingAt: item.airingAt,
      localTime: formatScheduleTime(item.airingAt),
      createdAt: new Date().toISOString(),
    };

    setTrackingState((current) => {
      const safeCurrent = withTrackingDefaults(current);
      const nextReminders = { ...safeCurrent.releaseReminders };

      if (nextReminders[reminderId]) {
        delete nextReminders[reminderId];
      } else {
        nextReminders[reminderId] = nextReminder;
      }

      return { ...safeCurrent, releaseReminders: nextReminders };
    });

    if (existingReminder) {
      void syncCancelledReminder(reminderId);
    } else {
      void syncArmedReminder(nextReminder);
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
    void syncClearedReminders();
  }

  function handleClearWatchingList() {
    setTrackingState((current) => ({
      ...withTrackingDefaults(current, items),
      following: {},
      followedAnimeIds: [],
      watchingList: {},
      watchChecks: {},
      watchCheckInitializedMediaIds: {},
    }));
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
    void syncClearedReminders();
    setImportStatus("Reset all app data.");
  }

  return (
    <main className="min-h-screen bg-night-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full justify-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex w-full max-w-[360px] flex-col gap-4 lg:w-fit lg:max-w-none lg:flex-row lg:items-start">
          <div className="relative mx-auto flex w-full max-w-[360px] shrink-0 flex-col lg:mx-0 lg:w-[360px]">
            <header className="relative z-50 mb-2 bg-night-950 pb-1">
              <div className="relative z-50 flex items-end justify-between gap-0">
                <div className="w-[13.5rem] shrink-0 max-[360px]:w-[12rem] max-[340px]:w-[11rem]">
                  <button
                    type="button"
                    onClick={goToToday}
                    className="block cursor-pointer text-left transition-opacity hover:opacity-95 focus-visible:opacity-95 focus-visible:outline-none"
                    aria-label="Simple Anime Schedule - return to today"
                  >
                    <img
                      src={logoSrc}
                      alt="Simple Anime Schedule"
                      className="h-auto w-full max-w-[13.5rem] object-contain sm:max-w-[16rem] lg:max-w-[18rem]"
                    />
                  </button>
                </div>
                <div
                  ref={bellAnchorRef}
                  className="absolute left-[calc(13.5rem+1rem)] top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 max-[360px]:left-[calc(12rem+1.75rem)] max-[360px]:h-8 max-[360px]:w-8 max-[340px]:left-[calc(11rem+2.25rem)] max-[340px]:h-7 max-[340px]:w-7"
                >
                  <button
                    ref={bellButtonRef}
                    type="button"
                    aria-label={bellAriaLabel}
                    aria-expanded={isWatchCheckPanelOpen}
                    aria-controls="watch-check-panel"
                    onClick={() => {
                      if (actionableWatchCheckGroups.length > 0) {
                        setIsWatchCheckPanelOpen((isOpen) => !isOpen);
                      }
                    }}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "touch") {
                        setIsBellHovered(true);
                      }
                    }}
                    onPointerLeave={() => {
                      bellFocusFromPointer.current = false;
                      setIsBellHovered(false);
                      setIsBellPressed(false);
                    }}
                    onPointerDown={() => {
                      bellFocusFromPointer.current = true;
                      setIsBellFocused(false);
                      setIsBellPressed(true);
                    }}
                    onPointerUp={() => {
                      bellFocusFromPointer.current = false;
                      setIsBellPressed(false);
                    }}
                    onPointerCancel={() => {
                      bellFocusFromPointer.current = false;
                      setIsBellPressed(false);
                    }}
                    onFocus={() => setIsBellFocused(!bellFocusFromPointer.current)}
                    onBlur={() => setIsBellFocused(false)}
                    className="relative h-full w-full rounded bg-transparent p-0 shadow-none transition focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/70 focus-visible:ring-offset-1 focus-visible:ring-offset-night-950"
                  >
                    <span
                      key={watchCheckBellAnimationKey}
                      className={`pointer-events-none inline-flex h-full w-full ${bellAnimationClass}`}
                    >
                      <img
                        src={bellImageSrc}
                        alt=""
                        aria-hidden="true"
                        className={`pointer-events-none h-full w-full object-contain ${
                          bellIsWaking ? "watch-check-bell-waking-scale" : ""
                        }`}
                      />
                    </span>
                    {actionableWatchCheckGroups.length >= 6 ? (
                      <>
                        <span className="watch-check-bell-reflection pointer-events-none absolute left-0 top-1/3 z-10 h-5 w-2 rounded-full max-[360px]:h-4 max-[360px]:w-1.5 max-[340px]:h-3.5 max-[340px]:w-1" />
                        <span className="watch-check-bell-reflection pointer-events-none absolute right-0 top-1/3 z-10 h-5 w-2 rounded-full max-[360px]:h-4 max-[360px]:w-1.5 max-[340px]:h-3.5 max-[340px]:w-1" />
                      </>
                    ) : null}
                    {actionableWatchCheckGroups.length >= 4 ? (
                      <img
                        src="/bell-anger-overlay.png"
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className={`pointer-events-none absolute z-20 object-contain ${
                          actionableWatchCheckGroups.length >= 6
                            ? "left-[-2px] top-[3px] h-[22px] w-[22px] max-[360px]:left-[-1px] max-[360px]:top-[3px] max-[360px]:h-[19px] max-[360px]:w-[19px] max-[340px]:h-[17px] max-[340px]:w-[17px]"
                            : "left-0 top-[5px] h-4 w-4 max-[360px]:top-[4px] max-[360px]:h-3.5 max-[360px]:w-3.5 max-[340px]:top-[3px] max-[340px]:h-3 max-[340px]:w-3"
                        }`}
                      />
                    ) : null}
                    {hasActionableWatchChecks ? <PendingWatchBadge count={actionableWatchCheckGroups.length} /> : null}
                  </button>
                </div>
                <WatchCheckPanel
                  groups={actionableWatchCheckGroups}
                  isOpen={isWatchCheckPanelOpen}
                  anchorRef={bellAnchorRef}
                  onClose={() => setIsWatchCheckPanelOpen(false)}
                  onMarkWatched={handleMarkWatchCheckGroupWatched}
                  onSnooze={handleSnoozeWatchCheckGroup}
                />
                <div className="flex w-28 shrink-0 flex-col items-end text-right">
                  <div className="mb-1 flex w-full flex-col items-end">
                    <div className="flex items-center justify-end gap-1 text-[0.58rem] font-semibold tracking-[0.12em] text-slate-400 sm:text-[0.62rem]">
                      <span>{selectedSeason.label}</span>
                      <img
                        src={selectedSeason.iconSrc}
                        alt=""
                        aria-hidden="true"
                        className="h-3 w-auto object-contain opacity-80 sm:h-3.5"
                      />
                    </div>
                    <span className="mt-0.5 text-[0.56rem] font-medium tracking-[0.08em] text-slate-500 sm:text-[0.6rem]">
                      シーズン '{selectedSeason.year}
                    </span>
                  </div>
                  <p className="w-full whitespace-nowrap text-right text-[0.8rem] font-semibold text-slate-400">
                    {selectedDayHeading}
                  </p>
                </div>
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
              mediaMetadata={watchingMediaMetadata}
              snoozedMediaIds={snoozedWatchingMediaIds}
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

  const watchChecks = normalizeWatchChecks(safeValue.watchChecks, loadedTitles, watchingList);
  const watchCheckLastSuccessfulScanAt =
    typeof safeValue.watchCheckLastSuccessfulScanAt === "number" &&
    Number.isFinite(safeValue.watchCheckLastSuccessfulScanAt)
      ? safeValue.watchCheckLastSuccessfulScanAt
      : undefined;
  const watchCheckInitializedMediaIds = normalizeWatchCheckInitializedMediaIds(
    safeValue.watchCheckInitializedMediaIds,
    watchingList,
  );

  return {
    followedAnimeIds: Object.values(following).map((item) => item.mediaId),
    following,
    watchingList,
    completedShows,
    releaseReminders,
    watchChecks,
    ...(watchCheckLastSuccessfulScanAt === undefined ? {} : { watchCheckLastSuccessfulScanAt }),
    watchCheckInitializedMediaIds,
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

function normalizeWatchCheckInitializedMediaIds(
  value: unknown,
  watchingList: Record<string, WatchingItem>,
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const watchingMediaIds = new Set(Object.values(watchingList).map((item) => String(item.mediaId)));
  return Object.fromEntries(
    Object.entries(value).filter(([mediaId, initialized]) => initialized === true && watchingMediaIds.has(mediaId)),
  );
}

function normalizeWatchChecks(
  value: unknown,
  loadedTitles: Map<number | string, string>,
  watchingList: Record<string, WatchingItem>,
): Record<string, WatchCheck> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized: Record<string, WatchCheck> = {};
  const watchingMediaIds = new Set(Object.values(watchingList).map((item) => String(item.mediaId)));

  for (const rawItem of Object.values(value)) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = rawItem as Partial<WatchCheck>;

    if (
      item.provider !== "anilist" ||
      !isValidMediaId(item.mediaId) ||
      !watchingMediaIds.has(String(item.mediaId)) ||
      typeof item.episode !== "number" ||
      !Number.isFinite(item.episode) ||
      !Number.isInteger(item.episode) ||
      item.episode < 1 ||
      typeof item.airingAt !== "number" ||
      !Number.isFinite(item.airingAt) ||
      !Number.isInteger(item.airingAt) ||
      item.airingAt < 1
    ) {
      continue;
    }

    const storedTitle =
      typeof item.displayTitle === "string" && isRenderableTitle(item.displayTitle) ? item.displayTitle.trim() : undefined;
    const displayTitle = storedTitle ?? loadedTitles.get(item.mediaId);

    if (!displayTitle) {
      continue;
    }

    const id = watchCheckKey(item.mediaId, item.episode);

    if (normalized[id]) {
      continue;
    }

    const eligibleAt =
      typeof item.eligibleAt === "number" && Number.isFinite(item.eligibleAt)
        && Number.isInteger(item.eligibleAt)
        && item.eligibleAt >= item.airingAt
        ? item.eligibleAt
        : watchCheckEligibilityTime(item.airingAt);
    const snoozedUntil =
      typeof item.snoozedUntil === "number" && Number.isFinite(item.snoozedUntil) && item.snoozedUntil >= 0
        ? item.snoozedUntil
        : undefined;

    normalized[id] = {
      id,
      provider: "anilist",
      mediaId: item.mediaId,
      displayTitle,
      episode: item.episode,
      airingAt: item.airingAt,
      eligibleAt,
      ...(snoozedUntil === undefined ? {} : { snoozedUntil }),
    };
  }

  return normalized;
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
