export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

export function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatDaySelectorLabel(date: Date) {
  return date
    .toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
    })
    .replace(",", "")
    .toUpperCase();
}

export type VisibleDay = {
  date: Date;
  weekdayLabel: string;
  dayNumber: string;
  isSelected: boolean;
  isToday: boolean;
};

export function getVisibleDays(visibleStartDate: Date, selectedDate: Date, dayCount = 4): VisibleDay[] {
  const today = new Date();

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(visibleStartDate, index);

    return {
      date,
      weekdayLabel: date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
      dayNumber: date.toLocaleDateString(undefined, { day: "numeric" }),
      isSelected: isSameLocalDay(date, selectedDate),
      isToday: isSameLocalDay(date, today),
    };
  });
}

export function formatScheduleTime(airingAt: number) {
  return new Date(airingAt * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type AnimeSeason = {
  label: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  iconSrc: string;
  year: string;
};

const SEASON_DETAILS = {
  WINTER: { iconSrc: "/season-winter.png" },
  SPRING: { iconSrc: "/season-spring.png" },
  SUMMER: { iconSrc: "/season-summer.png" },
  FALL: { iconSrc: "/season-fall.png" },
} as const;

export function getAnimeSeason(date: Date): AnimeSeason {
  const month = date.getMonth();
  const label =
    month <= 2 ? "WINTER" : month <= 5 ? "SPRING" : month <= 8 ? "SUMMER" : "FALL";

  return {
    label,
    iconSrc: SEASON_DETAILS[label].iconSrc,
    year: String(date.getFullYear()).slice(-2).padStart(2, "0"),
  };
}
