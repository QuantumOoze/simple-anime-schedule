type PendingWatchBadgeProps = {
  count: number;
};

function getPendingFlameState(count: number) {
  if (count >= 6) {
    return {
      src: "/pending-flame-6plus.png",
      imageClassName: "",
      className:
        "left-[36px] top-[-10px] h-[48px] w-[42px] max-[360px]:left-[27px] max-[360px]:top-[-8px] max-[360px]:h-[39px] max-[360px]:w-[33px] max-[340px]:left-[24px] max-[340px]:top-[-7px] max-[340px]:h-[35px] max-[340px]:w-[29px]",
    };
  }

  if (count >= 4) {
    return {
      src: "/pending-flame-4-5.png",
      imageClassName: "",
      className:
        "left-[37px] top-[-3px] h-[38px] w-[30px] max-[360px]:left-[27px] max-[360px]:top-[-3px] max-[360px]:h-[32px] max-[360px]:w-[26px] max-[340px]:left-[24px] max-[340px]:top-[-2px] max-[340px]:h-[28px] max-[340px]:w-[23px]",
    };
  }

  if (count >= 2) {
    return {
      src: "/pending-flame-2-3.png",
      imageClassName: "",
      className:
      "left-[35px] top-[-3px] h-[30px] w-[24px] max-[360px]:left-[26px] max-[360px]:top-[-2px] max-[360px]:h-[25px] max-[360px]:w-5 max-[340px]:left-[23px] max-[340px]:top-[-2px] max-[340px]:h-[22px] max-[340px]:w-[18px]",
    };
  }

  return {
    src: "/pending-flame-1.png",
    imageClassName: "",
    className:
      "left-[30px] top-[-1px] h-[21px] w-[18px] max-[360px]:left-[21px] max-[360px]:top-[-1px] max-[360px]:h-[18px] max-[360px]:w-4 max-[340px]:left-[18px] max-[340px]:top-[-1px] max-[340px]:h-[17px] max-[340px]:w-[15px]",
  };
}

export function PendingWatchBadge({ count }: PendingWatchBadgeProps) {
  const state = getPendingFlameState(count);

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute z-20 ${state.className}`}>
      <span className="watch-check-badge-float absolute inset-0">
        <img
          src={state.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`pointer-events-none h-full w-full object-contain ${state.imageClassName}`}
        />
      </span>
    </span>
  );
}
