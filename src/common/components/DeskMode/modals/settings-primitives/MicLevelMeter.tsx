import React from 'react';

interface MicLevelMeterProps {
  level: number;
  isActive: boolean;
}

const TOTAL_BARS = 20;
const DANGER_THRESHOLD = 0.85;
const BAR_INDICES = Array.from({ length: TOTAL_BARS }, (_, i) => i);

function MicLevelMeter({ level, isActive }: MicLevelMeterProps) {
  const activeBars = Math.round((level / 100) * TOTAL_BARS);

  return (
    <div className="flex items-center gap-[3px]" role="meter" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100} aria-label="Microphone level">
      {BAR_INDICES.map((i) => {
        const isLit = isActive && i < activeBars;
        const barPosition = i / TOTAL_BARS;
        const isDanger = barPosition >= DANGER_THRESHOLD;
        const isMid = barPosition >= 0.5 && !isDanger;

        let bgClass = 'bg-[var(--wd-surface-elevated)]';
        if (isLit) {
          if (isDanger) {
            bgClass = 'bg-[var(--wd-danger)]';
          } else if (isMid) {
            bgClass = 'bg-[var(--wd-success)]';
          } else {
            bgClass = 'bg-[var(--wd-accent)]';
          }
        }

        return (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm transition-colors duration-75 ${bgClass}`}
          />
        );
      })}
    </div>
  );
}

export default MicLevelMeter;
