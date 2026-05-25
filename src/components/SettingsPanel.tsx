import { Download, RotateCcw, Settings, Upload } from "lucide-react";

type SettingsPanelProps = {
  importStatus: string | null;
  onClearCompletedShows: () => void;
  onClearReminders: () => void;
  onClearWatchedEpisodes: () => void;
  onClearWatchingList: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetAllData: () => void;
};

export function SettingsPanel({
  importStatus,
  onClearCompletedShows,
  onClearReminders,
  onClearWatchedEpisodes,
  onClearWatchingList,
  onExportData,
  onImportData,
  onResetAllData,
}: SettingsPanelProps) {
  return (
    <details className="mt-3 rounded-md border border-white/10 bg-white/[0.025] text-[0.68rem]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-slate-200">
        <Settings size={13} strokeWidth={2.4} />
        Data
      </summary>

      <div className="grid gap-2 border-t border-white/[0.06] px-3 py-3">
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
    </details>
  );
}

const baseButtonClass =
  "flex min-h-8 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.035] px-2 py-1.5 font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-slate-100 focus-visible:bg-white/[0.07] focus-visible:text-slate-100 focus-visible:outline-none";
const actionClass = `${baseButtonClass} cursor-pointer`;
const mutedClass = baseButtonClass;
