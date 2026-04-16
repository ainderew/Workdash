import React, { useEffect, useMemo, useRef, useState } from "react";
import { useActivityStore } from "@/common/store/activityStore";
import type { UserActivity } from "@/communication/activity/_types";
import { Gamepad2, Sparkles, Tv } from "lucide-react";

function ListeningEqualizer() {
  return (
    <span className="inline-flex items-center gap-[2px] h-[11px] shrink-0" aria-hidden="true">
      <span className="wd-eq-bar" />
      <span className="wd-eq-bar [animation-delay:0.15s]" />
      <span className="wd-eq-bar [animation-delay:0.3s]" />
    </span>
  );
}

function MarqueeTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [marquee, setMarquee] = useState<{ active: boolean; duration: number }>({
    active: false,
    duration: 10,
  });

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      const textWidth = measure.scrollWidth;
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;
      const shouldScroll = textWidth > containerWidth;
      setMarquee({
        active: shouldScroll,
        duration: shouldScroll ? Math.max(5, textWidth / 25) : 10,
      });
    };

    const ro = new ResizeObserver(check);
    ro.observe(container);
    check();
    return () => ro.disconnect();
  }, [title]);

  return (
    <span ref={containerRef} className="overflow-hidden min-w-0 flex-1 relative">
      {marquee.active ? (
        <span
          className="wd-activity-marquee inline-block whitespace-nowrap"
          style={{ "--wd-marquee-duration": `${marquee.duration}s` } as React.CSSProperties}
        >
          <span className="pr-10">{title}</span>
          <span className="pr-10" aria-hidden="true">{title}</span>
        </span>
      ) : (
        <span className="whitespace-nowrap">{title}</span>
      )}
      <span
        ref={measureRef}
        className="absolute top-0 left-0 invisible whitespace-nowrap pointer-events-none"
        aria-hidden="true"
      >
        {title}
      </span>
    </span>
  );
}

function ActivityIcon({ type }: { type: UserActivity["type"] }) {
  const size = 11;
  switch (type) {
    case "listening":
      return <ListeningEqualizer />;
    case "watching":
      return <Tv size={size} className="shrink-0" />;
    case "playing":
      return <Gamepad2 size={size} className="shrink-0" />;
    case "custom":
      return <Sparkles size={size} className="shrink-0" />;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function formatActivityLabel(activity: UserActivity): string {
  switch (activity.type) {
    case "listening":
      return activity.title;
    case "watching":
      return `Watching ${activity.title}`;
    case "playing":
      return `Playing ${activity.title}`;
    case "custom":
      return activity.text;
    default: {
      const _exhaustive: never = activity;
      return _exhaustive;
    }
  }
}

function ActivityPill({ activity }: { activity: UserActivity }) {
  if (activity.type === "listening") {
    return (
      <span className="wd-activity-pill flex items-center gap-1.5 text-[11px] max-w-full overflow-hidden wd-text-muted rounded-full pl-1.5 pr-2 py-0.5">
        <ListeningEqualizer />
        <span className="opacity-60 shrink-0 whitespace-nowrap">Listening to</span>
        <MarqueeTitle title={activity.title} />
      </span>
    );
  }

  return (
    <span className="wd-activity-pill flex items-center gap-1 text-[11px] max-w-full wd-text-muted truncate">
      <ActivityIcon type={activity.type} />
      <span className="truncate">{formatActivityLabel(activity)}</span>
    </span>
  );
}

export function ActivityText({
  userId,
  workspaceId,
}: {
  userId: number;
  workspaceId: string | null;
}) {
  const activities = useActivityStore((s) =>
    workspaceId ? s.activityMap[workspaceId]?.[userId] : undefined,
  );

  const sorted = useMemo(() => {
    if (!activities) return [];
    return Object.values(activities).sort((a, b) => b.startedAt - a.startedAt);
  }, [activities]);

  if (sorted.length === 0) return null;

  return (
    <span className="flex flex-col items-start gap-0.5 min-w-0 max-w-full">
      {sorted.map((activity) => (
        <ActivityPill key={activity.source} activity={activity} />
      ))}
    </span>
  );
}
