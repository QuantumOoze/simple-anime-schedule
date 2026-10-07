import type { AiringItem } from "../types";
import { formatScheduleTime } from "../utils/date";
import { TruncatedTitle } from "./TruncatedTitle";

type TimelineState = "aired" | "current" | "upcoming";

type ScheduleRowProps = {
  item: AiringItem;
  timelineState: TimelineState;
  isFollowed: boolean;
  isCompleted: boolean;
  isReminderToggleable: boolean;
  hasReminder: boolean;
  isCurrentRelease: boolean;
  isWatched: boolean;
  onToggleFollowed: (item: AiringItem) => void;
  onToggleWatched: (animeId: number, episode: number) => void;
  onToggleReleaseReminder: (item: AiringItem) => void;
};

export function ScheduleRow({
  item,
  timelineState,
  isFollowed,
  isCompleted,
  isReminderToggleable,
  hasReminder,
  isCurrentRelease,
  isWatched,
  onToggleFollowed,
  onToggleWatched,
  onToggleReleaseReminder,
}: ScheduleRowProps) {
  const isAired = timelineState === "aired";
  const titleClass = isFollowed
    ? isAired
      ? "text-signal-gold/65"
      : "text-signal-gold"
    : isAired
      ? "text-slate-500"
      : "text-slate-100";
  const secondaryClass = isAired ? "text-slate-600" : "text-slate-300";
  const completedTextClass = isAired ? "text-white/80" : "text-white";
  const completedBoxClass = isAired ? "bg-signal-cyan/45" : "bg-signal-cyan/75";
  const showRedConnectedUnderline = isCurrentRelease && hasReminder;
  const showGoldTimeUnderline = isCurrentRelease && !hasReminder;
  const currentUnderlineClass = showGoldTimeUnderline
    ? "underline decoration-signal-gold decoration-2 underline-offset-4"
    : "";

  return (
    <li className="relative z-0 grid min-h-14 grid-cols-[3.75rem_minmax(0,1fr)_2rem_3.5rem] items-center gap-x-1 gap-y-2 border-b border-white/[0.06] px-1 py-3 last:border-b-0">
      {showRedConnectedUnderline ? (
        <span className="pointer-events-none absolute bottom-[0.78rem] left-1 right-[3.75rem] z-0 border-b border-red-300/70" />
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (isReminderToggleable) {
            onToggleReleaseReminder(item);
          }
        }}
        disabled={!isReminderToggleable}
        className={`justify-self-start text-sm font-semibold tabular-nums transition focus-visible:outline-none ${
          hasReminder ? "text-red-300/80" : secondaryClass
        } ${isReminderToggleable ? "cursor-pointer hover:text-red-300/90 focus-visible:text-red-300/90" : "cursor-default"} ${currentUnderlineClass}`}
        aria-label={
          isReminderToggleable
            ? `${hasReminder ? "Remove reminder for" : "Set reminder for"} ${item.title} episode ${item.episode}`
            : `${item.title} episode ${item.episode} aired at ${formatScheduleTime(item.airingAt)}`
        }
        aria-pressed={hasReminder}
      >
        <time dateTime={new Date(item.airingAt * 1000).toISOString()}>{formatScheduleTime(item.airingAt)}</time>
      </button>

      {isCompleted ? (
        <div
          className={`relative z-10 col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-1.5 rounded px-1.5 py-0.5 ${completedBoxClass}`}
        >
          <TruncatedTitle
            text={item.title}
            className={`min-w-0 flex-1 text-[0.95rem] font-semibold leading-snug ${completedTextClass}`}
          />
          <button
            type="button"
            onClick={() => onToggleWatched(item.animeId, item.episode)}
            className="group grid h-7 w-7 shrink-0 place-items-center rounded transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none"
            aria-label={`${isWatched ? "Mark unwatched" : "Mark watched"}: ${item.title} episode ${item.episode}`}
            aria-pressed={isWatched}
          >
            <img
              src={isWatched ? "/yhwach-watched-eye.png" : "/default-unwatched-eye.png"}
              alt=""
              aria-hidden="true"
              className={`h-7 w-7 object-contain transition ${
                isWatched
                  ? "origin-center scale-y-[1.32] opacity-100"
                  : "opacity-[0.62] grayscale-[0.72] saturate-[0.28] brightness-[0.82] group-hover:opacity-90 group-hover:grayscale-[0.25] group-hover:saturate-[0.65] group-hover:brightness-100 group-focus-visible:opacity-90 group-focus-visible:grayscale-[0.25] group-focus-visible:saturate-[0.65] group-focus-visible:brightness-100"
              }`}
            />
          </button>
        </div>
      ) : (
        <>
          <TruncatedTitle
            text={item.title}
            className={`relative z-10 min-w-0 text-[0.95rem] font-semibold leading-snug ${titleClass}`}
          />
          <button
            type="button"
            onClick={() => onToggleWatched(item.animeId, item.episode)}
            className="group relative z-10 grid h-8 w-8 shrink-0 place-items-center justify-self-center rounded-md transition hover:bg-white/[0.06]"
            aria-label={`${isWatched ? "Mark unwatched" : "Mark watched"}: ${item.title} episode ${item.episode}`}
            aria-pressed={isWatched}
          >
            <img
              src={isWatched ? "/yhwach-watched-eye.png" : "/default-unwatched-eye.png"}
              alt=""
              aria-hidden="true"
              className={`h-8 w-8 object-contain transition ${
                isWatched
                  ? "origin-center scale-y-[1.32] opacity-100"
                  : "opacity-[0.62] grayscale-[0.72] saturate-[0.28] brightness-[0.82] group-hover:opacity-90 group-hover:grayscale-[0.25] group-hover:saturate-[0.65] group-hover:brightness-100 group-focus-visible:opacity-90 group-focus-visible:grayscale-[0.25] group-focus-visible:saturate-[0.65] group-focus-visible:brightness-100"
              }`}
            />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onToggleFollowed(item)}
        className={`-ml-0.5 justify-self-start rounded px-2 py-2 text-sm font-extrabold tabular-nums transition hover:bg-white/[0.06] ${
          isFollowed ? (isAired ? "text-signal-gold/65" : "text-signal-gold") : secondaryClass
        }`}
        aria-label={`${isFollowed ? "Unfollow" : "Follow"} ${item.title}`}
        aria-pressed={isFollowed}
      >
        {typeof item.episodes === "number" && item.episodes > 0 ? (
          <span className="inline-flex items-start gap-1 leading-none">
            <span>EP</span>
            <span className="inline-flex flex-col items-center tabular-nums">
              <span>{item.episode}</span>
              <span className="mt-0.5 text-[0.68rem] font-semibold">{item.episodes}</span>
            </span>
          </span>
        ) : (
          <span>EP {item.episode}</span>
        )}
      </button>
    </li>
  );
}
