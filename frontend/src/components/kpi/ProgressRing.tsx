import { useEffect, useRef } from "react";
import type { KPIStatus } from "../../types";

const STATUS_COLOR: Record<KPIStatus, string> = {
  on_track: "#10b981",
  at_risk: "#f59e0b",
  behind: "#ef4444",
  completed: "#3b82f6",
};

interface ProgressRingProps {
  progress: number;    // 0-100
  status: KPIStatus;
  size?: number;       // svg diameter, default 80
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ProgressRing({
  progress,
  status,
  size = 80,
  strokeWidth = 7,
  showLabel = true,
}: ProgressRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = STATUS_COLOR[status] ?? "#94a3b8";

  // Animate dash offset on mount / progress change
  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start from 0, transition to actual value
    el.style.strokeDashoffset = String(circumference);
    const target = circumference - (progress / 100) * circumference;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)";
        el.style.strokeDashoffset = String(target);
      });
    });
  }, [progress, circumference]);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
      {showLabel && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color }}
        >
          {progress}%
        </div>
      )}
    </div>
  );
}
