import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, getVisibleDays } from "../utils/date";

type DaySelectorProps = {
  selectedDate: Date;
  visibleStartDate: Date;
  onSelectDate: (date: Date) => void;
  onVisibleStartDateChange: (date: Date) => void;
};

export function DaySelector({
  selectedDate,
  visibleStartDate,
  onSelectDate,
  onVisibleStartDateChange,
}: DaySelectorProps) {
  const days = getVisibleDays(visibleStartDate, selectedDate);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onVisibleStartDateChange(addDays(visibleStartDate, -1))}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08]"
        aria-label="Previous day"
      >
        <ChevronLeft size={20} strokeWidth={2.4} />
      </button>

      <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth py-1" aria-label="Select day">
        {days.map((day) => {
          return (
            <button
              key={day.date.toDateString()}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={`h-10 shrink-0 rounded-md px-3 text-xs font-extrabold tracking-[0.05em] transition ${
                day.isSelected
                  ? "bg-slate-100 text-night-950"
                  : "border border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
              }`}
              aria-pressed={day.isSelected}
            >
              {day.weekdayLabel} {day.dayNumber}
              {day.isToday ? <span className="ml-1 text-[0.65rem] opacity-60">TODAY</span> : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onVisibleStartDateChange(addDays(visibleStartDate, 1))}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08]"
        aria-label="Next day"
      >
        <ChevronRight size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}
