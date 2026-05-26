import { Download, RotateCcw, Settings, Upload } from "lucide-react";
import { useEffect, useRef } from "react";

type SettingsPanelProps = {
  isOpen: boolean;
  importStatus: string | null;
  onOpenChange: (isOpen: boolean) => void;
  onClearCompletedShows: () => void;
  onClearReminders: () => void;
  onClearWatchedEpisodes: () => void;
  onClearWatchingList: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetAllData: () => void;
};

export function SettingsPanel({
  isOpen,
  importStatus,
  onOpenChange,
  onClearCompletedShows,
  onClearReminders,
  onClearWatchedEpisodes,
  onClearWatchingList,
  onExportData,
  onImportData,
  onResetAllData,
}: SettingsPanelProps) {
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
        aria-label="Open data settings"
        aria-expanded={isOpen}
        aria-controls="data-settings-panel"
      >
        <Settings size={13} strokeWidth={2.4} />
      </button>

      {isOpen ? (
        <div
          id="data-settings-panel"
          className="absolute right-0 top-full z-50 mt-2 grid w-[min(20rem,calc(100vw-1.5rem))] gap-2 rounded-md border border-white/10 bg-night-900 px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onExportData} className={actionClass}>
              <Download size={13} strokeWidth={2.4} />
              Export JSON
            </button>
            <label className={actionClass}>
              <Upload size={13} strokeWidth={2.4} />
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";

                  if (file) {
                    onImportData(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClearWatchedEpisodes} className={mutedClass}>
              Clear watched
            </button>
            <button type="button" onClick={onClearReminders} className={mutedClass}>
              Clear reminders
            </button>
            <button type="button" onClick={onClearWatchingList} className={mutedClass}>
              Clear watching
            </button>
            <button type="button" onClick={onClearCompletedShows} className={mutedClass}>
              Clear completed
            </button>
          </div>

          <button type="button" onClick={onResetAllData} className={`${mutedClass} text-red-200/80 hover:text-red-100`}>
            <RotateCcw size={13} strokeWidth={2.4} />
            Reset all app data
          </button>

          {importStatus ? <p className="text-slate-500">{importStatus}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

const baseButtonClass =
  "flex min-h-8 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.035] px-2 py-1.5 font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-slate-100 focus-visible:bg-white/[0.07] focus-visible:text-slate-100 focus-visible:outline-none";
const actionClass = `${baseButtonClass} cursor-pointer`;
const mutedClass = baseButtonClass;
