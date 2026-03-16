import React from "react";

interface TrackInfoProps {
  title: string;
  lottieReady: boolean;
  LottieComponent: React.ComponentType<{
    animationData: object;
    loop: boolean;
    autoplay: boolean;
    style?: React.CSSProperties;
  }> | null;
  animationData: object | null;
}

export function TrackInfo({
  title,
  lottieReady,
  LottieComponent,
  animationData,
}: TrackInfoProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      {lottieReady && LottieComponent && animationData ? (
        <div className="w-20 h-20 shrink-0">
          <LottieComponent
            animationData={animationData}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : (
        <span className="wd-text-muted text-xs shrink-0">{"\u266B"}</span>
      )}
      <span className="wd-text-primary text-xs font-medium truncate text-wrap text-center">
        {title}
      </span>
    </div>
  );
}
