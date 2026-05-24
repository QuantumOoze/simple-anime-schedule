import type { AiringItem } from "../types";
import { isSameLocalDay } from "../utils/date";
import { episodeKey } from "../utils/tracking";
import { ScheduleRow } from "./ScheduleRow";

type ScheduleListProps = {
  selectedDate: Date;
  items: AiringItem[];
  isLoading: boolean;
  error: string | null;
  followedAnimeIds: number[];
  completedAnimeIds: number[];
  reminderIds: Set<string>;
  watchedEpisodes: Record<string, boolean>;
  onToggleFollowed: (item: AiringItem) => void;
  onToggleWatched: (animeId: number, episode: number) => void;
  onToggleReleaseReminder: (item: AiringItem) => void;
};

export function ScheduleList({
  selectedDate,
  items,
  isLoading,
  error,
  followedAnimeIds,
  completedAnimeIds,
  reminderIds,
  watchedEpisodes,
  onToggleFollowed,
  onToggleWatched,
  onToggleReleaseReminder,
}: ScheduleListProps) {
  if (isLoading) {
    return <BoardState message="Loading broadcasts..." />;
  }

  if (error) {
    return <BoardState message={error} tone="error" />;
  }

  if (items.length === 0) {
    return <BoardState message="No releases found for this day." />;
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const isViewingToday = isSameLocalDay(selectedDate, new Date());
  const currentItemId = isViewingToday ? getCurrentItemId(items) : null;

  return (
    <ol className="relative z-0 overflow-hidden rounded-md border border-white/10 bg-night-850/70 shadow-board">
      {items.map((item) => (
        <ScheduleRow
          key={item.id}
          item={item}
          timelineState={getTimelineState(item, currentItemId)}
          isFollowed={followedAnimeIds.includes(item.animeId)}
          isCompleted={completedAnimeIds.includes(item.animeId)}
          isReminderToggleable={item.airingAt > nowUnix}
          hasReminder={reminderIds.has(getReminderKey(item))}
          isCurrentRelease={item.id === currentItemId}
          isWatched={Boolean(watchedEpisodes[episodeKey(item.animeId, item.episode)])}
          onToggleFollowed={onToggleFollowed}
          onToggleWatched={onToggleWatched}
          onToggleReleaseReminder={onToggleReleaseReminder}
        />
      ))}
    </ol>
  );
}

function getReminderKey(item: AiringItem) {
  return `anilist:${item.animeId}:${item.episode}:${item.airingAt}`;
}

function BoardState({ message, tone = "muted" }: { message: string; tone?: "muted" | "error" }) {
  return (
    <div
      className={`rounded-md border px-4 py-10 text-center text-sm ${
        tone === "error"
          ? "border-red-400/20 bg-red-950/20 text-red-200"
          : "border-white/10 bg-white/[0.035] text-slate-400"
      }`}
    >
      {message}
    </div>
  );
}

function getCurrentItemId(items: AiringItem[]) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const upcoming = items.find((item) => item.airingAt >= nowUnix);

  if (upcoming) {
    return upcoming.id;
  }

  return items[items.length - 1]?.id ?? null;
}

function getTimelineState(item: AiringItem, currentItemId: number | null) {
  if (item.id === currentItemId) {
    return "current";
  }

  return item.airingAt < Math.floor(Date.now() / 1000) ? "aired" : "upcoming";
}
