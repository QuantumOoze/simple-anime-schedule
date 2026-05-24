import { useRef, useState } from "react";

type TruncatedTitleProps = {
  text: string;
  className?: string;
  focusable?: boolean;
};

export function TruncatedTitle({ text, className = "", focusable = true }: TruncatedTitleProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  function revealIfTruncated() {
    const element = textRef.current;
    setShowTooltip(Boolean(element && element.scrollWidth > element.clientWidth));
  }

  function hideTooltip() {
    setShowTooltip(false);
  }

  return (
    <span
      className={`relative block min-w-0 ${className}`}
      onMouseEnter={revealIfTruncated}
      onMouseLeave={hideTooltip}
      onFocus={revealIfTruncated}
      onBlur={hideTooltip}
      onTouchStart={revealIfTruncated}
      tabIndex={focusable ? 0 : -1}
    >
      <span ref={textRef} className="block min-w-0 truncate">
        {text}
      </span>
      {showTooltip ? (
        <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 max-w-[min(18rem,80vw)] rounded border border-white/10 bg-night-900 px-2 py-1 text-[0.72rem] font-medium leading-snug text-slate-100 shadow-board">
          {text}
        </span>
      ) : null}
    </span>
  );
}
