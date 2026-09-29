import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { MediaAiringMetadata, WatchingItem } from "../types";
import { TruncatedTitle } from "./TruncatedTitle";

type FollowedListProps = {
  followedItems: WatchingItem[];
  mediaMetadata: Record<string, MediaAiringMetadata>;
  snoozedMediaIds: ReadonlySet<string>;
  selectedWatchingId: string | null;
  onSelectWatchingItem: (id: string) => void;
  onClearSelectedWatchingItem: () => void;
  onRemoveWatchingItem: (id: string) => void;
  onCompleteWatchingItem: (item: WatchingItem) => void;
};

export function FollowedList({
  followedItems,
  mediaMetadata,
  snoozedMediaIds,
  selectedWatchingId,
  onSelectWatchingItem,
  onClearSelectedWatchingItem,
  onRemoveWatchingItem,
  onCompleteWatchingItem,
}: FollowedListProps) {
  const containerRef = useRef<HTMLElement>(null);
  const selectedItem = followedItems.find((item) => item.id === selectedWatchingId);

  useEffect(() => {
    if (!selectedWatchingId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      onClearSelectedWatchingItem();
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClearSelectedWatchingItem, selectedWatchingId]);

  if (followedItems.length === 0) {
    return <p className="text-[0.68rem] font-medium leading-snug text-slate-600 lg:w-36">No followed shows yet.</p>;
  }

  return (
    <aside ref={containerRef} aria-label="Followed shows" className="w-full text-[0.68rem] leading-snug lg:w-36">
      {selectedItem ? (
        <div className="mb-2">
          <p className="mb-1 font-bold text-emerald-400">Complete Show?</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClearSelectedWatchingItem();
              }}
              className="grid h-7 w-8 place-items-center rounded border border-white/10 bg-white/[0.035] text-red-300/70 transition hover:bg-red-500/10 hover:text-red-200 focus-visible:bg-red-500/10 focus-visible:text-red-200 focus-visible:outline-none"
              aria-label={`Cancel completing ${selectedItem.displayTitle}`}
            >
              <X size={14} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCompleteWatchingItem(selectedItem);
                onClearSelectedWatchingItem();
              }}
              className="grid h-7 w-8 place-items-center rounded border border-white/10 bg-white/[0.035] text-emerald-300/80 transition hover:bg-emerald-500/10 hover:text-emerald-200 focus-visible:bg-emerald-500/10 focus-visible:text-emerald-200 focus-visible:outline-none"
              aria-label={`Complete ${selectedItem.displayTitle}`}
            >
              <Check size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      ) : null}
      <h2 className="mb-2 font-bold uppercase tracking-[0.14em] text-slate-500">Watching</h2>
      <ul className="space-y-1">
        {followedItems.map((item) => {
          const nextAiring = mediaMetadata[String(item.mediaId)]?.nextAiringEpisode;
          const nextAiringLabel = nextAiring
            ? `Next episode: EP ${nextAiring.episode} • ${formatLocalDate(nextAiring.airingAt)}`
            : "Next episode: TBA";

          return (
            <li key={item.id} className="flex max-w-full items-center gap-1">
              <span className="flex min-w-0 flex-1 items-center gap-[3px]">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectWatchingItem(item.id);
                }}
                className={`min-w-0 max-w-full flex-[0_1_auto] truncate text-left font-medium transition focus-visible:outline-none ${
                  selectedWatchingId === item.id
                    ? "text-xs text-signal-cyan"
                    : "text-[0.68rem] text-signal-cyan/80 hover:text-signal-cyan"
                }`}
                title={nextAiringLabel}
                aria-label={`${item.displayTitle}. ${nextAiringLabel}`}
              >
                <TruncatedTitle text={item.displayTitle} focusable={false} />
              </button>
              {snoozedMediaIds.has(String(item.mediaId)) ? (
                <img
                  src="/snoozed-zzz-cropped.png"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none h-[15px] w-auto shrink-0 object-contain max-[360px]:h-[14px] max-[340px]:h-[13px]"
                />
              ) : null}
              </span>
              {selectedWatchingId === item.id ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveWatchingItem(item.id);
                  }}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded text-red-300/35 transition hover:bg-red-500/10 hover:text-red-200/90 focus-visible:bg-red-500/10 focus-visible:text-red-200/90 focus-visible:outline-none"
                  aria-label={`Remove ${item.displayTitle} from watching list`}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function formatLocalDate(airingAt: number) {
  return new Date(airingAt * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
