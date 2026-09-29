import { CircleHelp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type HelpPanelProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const helpSections = [
  {
    title: "Navigation",
    items: [
      "Date arrows move the visible date tabs only.",
      "Tap a date to load that day's schedule.",
      'Tap "Simple Anime Schedule" to return to today.',
    ],
  },
  {
    title: "Filters & Source",
    items: [
      "RAW / SUB / DUB / ALL are schedule filters.",
      "AniList airing data currently behaves mostly like broadcast airing data, so RAW/SUB/DUB distinctions may be limited.",
      "Schedule source: AniList airing data.",
      "Times are shown in your local timezone.",
    ],
  },
  {
    title: "Schedule Rows",
    items: [
      "Time is the local release time.",
      "Tap a future time to toggle a reminder.",
      "Red time means reminder set.",
      "Gold underline under time marks the current release.",
      "Red underline from time to title marks current release with reminder.",
      "Eye marks an episode watched or unwatched.",
      "EP toggles currently watching/following.",
    ],
  },
  {
    title: "Visual States",
    items: [
      "Gold title means currently watching.",
      "Blue title + eye box means completed show.",
      "Grey row means already aired.",
      "Bright row means upcoming.",
    ],
  },
  {
    title: "Watching List",
    items: [
      "Watching shows followed titles.",
      "Tap a Watching title to select it.",
      "X removes it from Watching only.",
      "Complete Show? tick marks it completed.",
      "Complete Show? red X cancels.",
      "A small Zzz means one of the show's Watch Checks is snoozed.",
      "Zzz appears only in the Watching list, not the main schedule.",
    ],
  },
  {
    title: "Watch Check & Snooze",
    items: [
      "Watching shows can generate a Watch Check about 24 hours after an episode airs.",
      "The ghost bell wakes when actionable Watch Checks exist.",
      "Tap the bell to open the pending Watch Check list.",
      "Tap a title to expand its actions; tap it again to collapse it.",
      "Only one title expands at a time.",
      "Watched resolves a single episode; Caught up resolves grouped episodes.",
      "Snooze temporarily removes that check from the pending list.",
      "Snooze defaults to 7 days and can be adjusted from 1–30 days.",
      "Snoozing does not remove a title from Watching; snoozed titles show Zzz there.",
      "The flame spirit beside the bell becomes more intense as pending checks build up.",
    ],
  },
  {
    title: "Data & Settings",
    items: [
      "Gear opens data/settings.",
      "Export JSON saves a backup of current local app data.",
      "Import JSON restores exported app data.",
      "App data is stored locally in this browser/device.",
      "Clear watched, Clear reminders, Clear Watching, and Clear completed remove those local data categories.",
      "Reset all app data clears all tracking data.",
    ],
  },
];

export function HelpPanel({ isOpen, onOpenChange }: HelpPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setExpandedSection(null);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="relative text-[0.68rem]">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="grid h-7 w-7 place-items-center rounded border border-white/10 bg-white/[0.035] text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200 focus-visible:bg-white/[0.07] focus-visible:text-slate-200 focus-visible:outline-none"
        aria-label="Open help and key"
        aria-expanded={isOpen}
        aria-controls="help-key-panel"
      >
        <CircleHelp size={13} strokeWidth={2.4} />
      </button>

      {isOpen ? (
        <div
          id="help-key-panel"
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(72vh,36rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-md border border-white/10 bg-night-900 px-3 py-3 text-slate-300 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <h2 className="mb-2 text-xs font-black text-slate-100">Help / Key</h2>
          <div className="grid gap-1">
            {helpSections.map((section) => {
              const isExpanded = expandedSection === section.title;
              const contentId = `help-section-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

              return (
                <section key={section.title} className={`rounded border ${isExpanded ? "border-sky-300/30 bg-sky-300/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={() => setExpandedSection((current) => (current === section.title ? null : section.title))}
                    className="flex min-h-9 w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-bold uppercase tracking-[0.1em] text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-300/70"
                  >
                    <span>{section.title}</span>
                    <span aria-hidden="true" className="text-slate-500">{isExpanded ? "▴" : "▾"}</span>
                  </button>
                  {isExpanded ? (
                    <div id={contentId} className="border-t border-white/[0.08] px-2 pb-2 pt-2">
                      <ul className="grid gap-1">
                        {section.items.map((item) => (
                          <li key={item} className="leading-snug text-slate-300">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
