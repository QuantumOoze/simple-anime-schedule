import { useId, useRef, useState } from "react";
import { AnimeFlameTooltip } from "./AnimeFlameTooltip";

type TruncatedTitleProps = {
  text: string;
  className?: string;
  focusable?: boolean;
  showTooltip?: boolean;
};

export function TruncatedTitle({ text, className = "", focusable = true, showTooltip = true }: TruncatedTitleProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [showTooltipState, setShowTooltipState] = useState(false);

  function revealIfTruncated() {
    const element = textRef.current;
    setShowTooltipState(Boolean(element && element.scrollWidth > element.clientWidth));
  }

  function hideTooltip() {
    setShowTooltipState(false);
  }

  return (
    <span
      className={`relative block min-w-0 ${className}`}
      onMouseEnter={revealIfTruncated}
      onMouseLeave={hideTooltip}
      onFocus={revealIfTruncated}
      onBlur={hideTooltip}
      onTouchStart={revealIfTruncated}
      onTouchEnd={hideTooltip}
      onTouchCancel={hideTooltip}
      aria-describedby={showTooltip && showTooltipState ? tooltipId : undefined}
      tabIndex={focusable ? 0 : -1}
    >
      <span ref={textRef} className="block min-w-0 truncate">
        {text}
      </span>
      <AnimeFlameTooltip
        id={tooltipId}
        open={showTooltip && showTooltipState}
        contentClassName="anime-flame-tooltip-title"
      >
        {text}
      </AnimeFlameTooltip>
    </span>
  );
}
