import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ActionableWatchCheckGroup } from "../utils/watchChecks";

type WatchCheckPanelProps = {
  groups: ActionableWatchCheckGroup[];
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onMarkWatched: (group: ActionableWatchCheckGroup) => void;
  onSnooze: (group: ActionableWatchCheckGroup, days: number) => void;
};

export function WatchCheckPanel({
  groups,
  isOpen,
  anchorRef,
  onClose,
  onMarkWatched,
  onSnooze,
}: WatchCheckPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);
  const [snoozeMode, setSnoozeMode] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState(7);

  useEffect(() => {
    if (!isOpen) {
      setExpandedMediaId(null);
      setSnoozeMode(false);
      setSnoozeDays(7);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (groups.length === 0) {
      onClose();
      return;
    }

    if (expandedMediaId !== null && !groups.some((group) => String(group.mediaId) === expandedMediaId)) {
      setExpandedMediaId(null);
      setSnoozeMode(false);
      setSnoozeDays(7);
    }
  }, [expandedMediaId, groups, isOpen, onClose]);

  if (!isOpen || groups.length === 0) {
    return null;
  }

  function toggleExpanded(mediaId: string) {
    setExpandedMediaId((current) => {
      const next = current === mediaId ? null : mediaId;
      if (next !== current) {
        setSnoozeMode(false);
        setSnoozeDays(7);
      }
      return next;
    });
  }

  return (
    <div
      ref={panelRef}
      id="watch-check-panel"
      className="absolute left-[calc(13.5rem+1rem)] top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-md border border-white/10 bg-night-900 px-3 py-3 text-[0.68rem] text-slate-300 shadow-[0_18px_40px_rgba(0,0,0,0.45)] max-[360px]:left-[calc(12rem+1.75rem)] max-[340px]:left-[calc(11rem+2.25rem)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-100">Watch Check</h2>
        <div className="flex items-center gap-2 text-slate-500">
          <span aria-label={`${groups.length} pending watch check groups`}>{groups.length} pending</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close watch check panel"
            className="grid h-5 w-5 place-items-center rounded text-sm text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/70"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {groups.map((group) => {
          const mediaId = String(group.mediaId);
          const isExpanded = expandedMediaId === mediaId;
          const episodes = getEpisodeSummary(group.checks.map((check) => check.episode));
          const actionLabel = group.checks.length > 1 ? "Caught up" : "Watched";
          const contentId = `watch-check-group-${mediaId}`;

          return (
            <div
              key={mediaId}
              className={`rounded border ${isExpanded ? "border-sky-300/30 bg-sky-300/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={contentId}
                onClick={() => toggleExpanded(mediaId)}
                className="flex min-h-10 w-full items-center gap-2 px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-300/70"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100" title={group.displayTitle}>
                  {group.displayTitle}
                </span>
                <span className="shrink-0 text-slate-500">EP {episodes}</span>
                <span aria-hidden="true" className="w-4 shrink-0 text-center text-slate-400">
                  {isExpanded ? "▴" : "▾"}
                </span>
              </button>

              {isExpanded ? (
                <div id={contentId} className="border-t border-white/[0.08] px-2 pb-2 pt-2">
                  {snoozeMode ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSnoozeDays((days) => Math.max(1, days - 1))}
                        aria-label="Decrease snooze days"
                        className={smallButtonClass}
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center font-semibold text-slate-200" aria-live="polite">
                        {snoozeDays}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSnoozeDays((days) => Math.min(30, days + 1))}
                        aria-label="Increase snooze days"
                        className={smallButtonClass}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSnoozeMode(false);
                          setSnoozeDays(7);
                          onSnooze(group, snoozeDays);
                        }}
                        className={actionButtonClass}
                      >
                        Snooze
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => onMarkWatched(group)} className={actionButtonClass}>
                        {actionLabel}
                      </button>
                      <button type="button" onClick={() => setSnoozeMode(true)} className={secondaryButtonClass}>
                        Snooze
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getEpisodeSummary(episodes: number[]) {
  const sorted = [...episodes].sort((left, right) => left - right);
  const isConsecutive = sorted.every((episode, index) => index === 0 || episode === sorted[index - 1] + 1);

  if (sorted.length === 1) {
    return String(sorted[0]);
  }

  return isConsecutive ? `${sorted[0]}–${sorted[sorted.length - 1]}` : `${sorted.length} episodes`;
}

const smallButtonClass =
  "grid h-7 min-w-7 place-items-center rounded border border-white/10 bg-white/[0.035] px-1.5 font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/70";
const actionButtonClass =
  "rounded border border-sky-300/20 bg-sky-300/10 px-2.5 py-1.5 font-semibold text-sky-200 transition hover:bg-sky-300/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/70";
const secondaryButtonClass =
  "rounded border border-white/10 bg-white/[0.035] px-2.5 py-1.5 font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/70";
