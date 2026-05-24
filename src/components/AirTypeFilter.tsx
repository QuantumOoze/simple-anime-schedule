import type { AirType } from "../types";

const FILTERS: AirType[] = ["RAW", "SUB", "DUB", "ALL"];

type AirTypeFilterProps = {
  selectedAirType: AirType;
  onChange: (airType: AirType) => void;
};

export function AirTypeFilter({ selectedAirType, onChange }: AirTypeFilterProps) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-md border border-white/10 bg-white/[0.035] p-1">
      {FILTERS.map((airType) => (
        <button
          key={airType}
          type="button"
          onClick={() => onChange(airType)}
          className={`h-9 rounded text-xs font-bold tracking-[0.08em] transition ${
            selectedAirType === airType
              ? "bg-signal-gold text-night-950 shadow-sm"
              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
          }`}
          aria-pressed={selectedAirType === airType}
        >
          {airType}
        </button>
      ))}
    </div>
  );
}
