import { useEffect, useRef, useState, type ReactNode } from "react";

type FlameVariant = "low" | "flare" | "high";

type AnimeFlameTooltipProps = {
  children: ReactNode;
  open: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
};

let nextVariantIndex = 0;
const variants: FlameVariant[] = ["low", "flare", "high"];
const flameAssets: Record<FlameVariant, string> = {
  low: "/Neon Blue Flame Speech Bubble 1.png",
  flare: "/Neon Blue Flame Speech Bubble 2.png",
  high: "/Neon Blue Flame Speech Bubble 3.png",
};

export function AnimeFlameTooltip({ children, open, className = "", contentClassName = "", id }: AnimeFlameTooltipProps) {
  const wasOpen = useRef(false);
  const [variant, setVariant] = useState<FlameVariant>("low");

  useEffect(() => {
    if (open && !wasOpen.current) {
      setVariant(variants[nextVariantIndex]);
      nextVariantIndex = (nextVariantIndex + 1) % variants.length;
    }

    wasOpen.current = open;
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <span
      role="tooltip"
      id={id}
      className={`anime-flame-tooltip anime-flame-tooltip-${variant} ${className}`}
    >
      <img
        className="anime-flame-tooltip-art"
        src={flameAssets[variant]}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="anime-flame-tooltip-safe-zone">
        <span className={`anime-flame-tooltip-content ${contentClassName}`}>{children}</span>
      </span>
    </span>
  );
}
