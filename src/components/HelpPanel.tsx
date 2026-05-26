import { CircleHelp } from "lucide-react";
import { useEffect, useRef } from "react";

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
    title: "Filters",
    items: [
      "RAW / SUB / DUB / ALL are schedule filters.",
      "AniList airing data may behave mostly like broadcast airing data for now.",
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
    ],
  },
  {
    title: "Data",
    items: [
      "Gear opens data/settings.",
      "Export JSON backs up local app data.",
      "Import JSON restores app data.",
      "App data is stored locally in this browser.",
    ],
  },
  {
    title: "Source",
    items: ["Schedule source: AniList airing data.", "Times shown in local timezone."],
  },
];

export function HelpPanel({ isOpen, onOpenChange }: HelpPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
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
          <div className="grid gap-3">
            {helpSections.map((section) => (
              <section key={section.title}>
                <h3 className="mb-1 font-bold uppercase tracking-[0.12em] text-slate-500">{section.title}</h3>
                <ul className="grid gap-1">
                  {section.items.map((item) => (
                    <li key={item} className="leading-snug text-slate-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
