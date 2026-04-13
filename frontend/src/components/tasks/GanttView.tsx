import React, { useMemo, useRef, useState } from "react";
import type { Task, User } from "../../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH = 32;          // px per day
const ROW_HEIGHT = 48;         // px per task row
const HEADER_HEIGHT = 60;      // px for month/day header
const LABEL_WIDTH = 220;       // px for sticky task-name column
const BAR_RADIUS = 6;          // px corner radius on task bars
const MIN_DAYS = 30;           // minimum chart window

// ─── Colour helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  in_progress: "#f59e0b",
  completed: "#10b981",
  cancelled: "#e11d48",
};

const PRIORITY_ACCENT: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#9ca3af",
};

// ─── Date utils ───────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  return new Date(s.split("T")[0]);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  task: Task;
}

interface GanttViewProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  currentUser: User;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttView({ tasks, onViewTask }: GanttViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Only render tasks that have a due_date
  const renderable = useMemo(
    () => tasks.filter((t) => Boolean(t.due_date)),
    [tasks]
  );

  // Calculate date range
  const { chartStart, totalDays } = useMemo(() => {
    if (renderable.length === 0) {
      const s = new Date();
      return { chartStart: addDays(s, -7), totalDays: MIN_DAYS };
    }
    const allDates: Date[] = renderable.flatMap((t) => [
      parseDate(t.created_at),
      parseDate(t.due_date),
    ]);
    const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const start = addDays(minD, -7);
    const end = addDays(maxD, 7);
    const days = Math.max(daysBetween(start, end), MIN_DAYS);
    return { chartStart: start, totalDays: days };
  }, [renderable]);

  const chartWidth = totalDays * DAY_WIDTH;
  const svgHeight = HEADER_HEIGHT + renderable.length * ROW_HEIGHT;

  // Today offset
  const today = new Date();
  const todayOffset = daysBetween(chartStart, today);

  // Build month columns for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; startDay: number; endDay: number }[] = [];
    let cursor = new Date(chartStart);
    let day = 0;
    let currentMonth = cursor.getMonth();
    let currentYear = cursor.getFullYear();
    let groupStart = 0;

    while (day < totalDays) {
      const d = addDays(chartStart, day);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        groups.push({ label: formatMonthLabel(cursor), startDay: groupStart, endDay: day - 1 });
        groupStart = day;
        currentMonth = d.getMonth();
        currentYear = d.getFullYear();
        cursor = d;
      }
      day++;
    }
    groups.push({ label: formatMonthLabel(cursor), startDay: groupStart, endDay: totalDays - 1 });
    return groups;
  }, [chartStart, totalDays]);

  function handleBarMouseMove(e: React.MouseEvent, task: Task) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8, task });
  }

  function handleBarMouseLeave() {
    setTooltip(null);
  }

  if (renderable.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <svg width={64} height={64} viewBox="0 0 64 64" fill="none" className="mb-4 opacity-40">
          <rect x={8} y={20} width={20} height={8} rx={2} fill="currentColor" />
          <rect x={8} y={34} width={36} height={8} rx={2} fill="currentColor" />
          <rect x={8} y={48} width={12} height={8} rx={2} fill="currentColor" />
        </svg>
        <p className="text-sm">ไม่มีงานที่มีกำหนดส่ง — เพิ่มงานพร้อมกำหนดส่งก่อน</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* ── Sticky label column + scrollable chart ── */}
      <div className="flex" style={{ height: svgHeight + 4 }}>

        {/* Left: task labels (sticky) */}
        <div
          className="flex-shrink-0 border-r border-gray-100 bg-white z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div
            className="border-b border-gray-100 flex items-end px-4 pb-2"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">งาน</span>
          </div>

          {/* Task rows */}
          {renderable.map((task) => {
            const avatars = task.assignments.slice(0, 2);
            return (
              <div
                key={task.id}
                title={task.title}
                className="flex items-center gap-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                style={{ height: ROW_HEIGHT, borderBottom: "1px solid #f1f5f9" }}
                onClick={() => onViewTask(task)}
              >
                {/* Priority accent dot */}
                <span
                  className="flex-shrink-0 w-1.5 h-6 rounded-full"
                  style={{ background: PRIORITY_ACCENT[task.priority] ?? "#9ca3af" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                    {task.title}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {task.project_name ?? "ไม่มีโปรเจกต์"}
                  </p>
                </div>
                <div className="flex -space-x-1 flex-shrink-0">
                  {avatars.map((a) => (
                    <div
                      key={a.id}
                      title={`${a.first_name} ${a.last_name}`}
                      className="w-5 h-5 rounded-full bg-[#5A5A40] flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white"
                    >
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                  ))}
                  {task.assignments.length > 2 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600 ring-1 ring-white">
                      +{task.assignments.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: scrollable SVG chart */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={containerRef}>
          <svg
            width={chartWidth}
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            {/* ── Month header background ── */}
            <rect x={0} y={0} width={chartWidth} height={HEADER_HEIGHT} fill="#f8fafc" />

            {/* ── Month labels ── */}
            {monthGroups.map((g) => (
              <g key={g.label + g.startDay}>
                <line
                  x1={g.startDay * DAY_WIDTH}
                  y1={0}
                  x2={g.startDay * DAY_WIDTH}
                  y2={HEADER_HEIGHT}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={g.startDay * DAY_WIDTH + 8}
                  y={HEADER_HEIGHT / 2 + 4}
                  fontSize={11}
                  fontWeight="600"
                  fill="#64748b"
                  fontFamily="Inter, sans-serif"
                >
                  {g.label}
                </text>
              </g>
            ))}

            {/* Header separator */}
            <line x1={0} y1={HEADER_HEIGHT} x2={chartWidth} y2={HEADER_HEIGHT} stroke="#e2e8f0" strokeWidth={1} />

            {/* ── Alternating row backgrounds ── */}
            {renderable.map((_task, rowIdx) => (
              <rect
                key={rowIdx}
                x={0}
                y={HEADER_HEIGHT + rowIdx * ROW_HEIGHT}
                width={chartWidth}
                height={ROW_HEIGHT}
                fill={rowIdx % 2 === 0 ? "#ffffff" : "#f8fafc"}
              />
            ))}

            {/* ── Vertical grid lines (every 7 days) ── */}
            {Array.from({ length: Math.ceil(totalDays / 7) + 1 }, (_, w) => w * 7).map((d) => (
              <line
                key={d}
                x1={d * DAY_WIDTH}
                y1={HEADER_HEIGHT}
                x2={d * DAY_WIDTH}
                y2={svgHeight}
                stroke="#e2e8f0"
                strokeWidth={0.5}
                strokeDasharray="4 2"
              />
            ))}

            {/* ── Row separator lines ── */}
            {renderable.map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={chartWidth}
                y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            ))}

            {/* ── Task bars ── */}
            {renderable.map((task, i) => {
              const startDate = parseDate(task.created_at);
              const endDate = parseDate(task.due_date);
              const startOffset = Math.max(daysBetween(chartStart, startDate), 0);
              const rawDuration = Math.max(daysBetween(startDate, endDate), 1);
              const x = startOffset * DAY_WIDTH;
              const y = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT * 0.2;
              const barHeight = ROW_HEIGHT * 0.6;
              const barWidth = Math.max(rawDuration * DAY_WIDTH, DAY_WIDTH);
              const fill = STATUS_COLORS[task.status] ?? "#94a3b8";
              const accent = PRIORITY_ACCENT[task.priority] ?? "#9ca3af";
              const isCompleted = task.status === "completed";

              return (
                <g
                  key={task.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => onViewTask(task)}
                  onMouseMove={(e) => handleBarMouseMove(e, task)}
                  onMouseLeave={handleBarMouseLeave}
                >
                  {/* Main bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={BAR_RADIUS}
                    fill={fill}
                    opacity={isCompleted ? 0.55 : 0.85}
                  />
                  {/* Priority accent left stripe */}
                  <rect
                    x={x}
                    y={y}
                    width={4}
                    height={barHeight}
                    rx={BAR_RADIUS}
                    fill={accent}
                    opacity={0.9}
                  />
                  {/* Progress fill (lighter overlay) */}
                  {task.progress > 0 && (
                    <rect
                      x={x + 4}
                      y={y + barHeight - 4}
                      width={Math.max((barWidth - 4) * task.progress / 100, 0)}
                      height={4}
                      rx={2}
                      fill="rgba(255,255,255,0.6)"
                    />
                  )}
                  {/* Text label inside bar */}
                  {barWidth > 60 && (
                    <text
                      x={x + 10}
                      y={y + barHeight / 2 + 4}
                      fontSize={10}
                      fontWeight="600"
                      fill="white"
                      fontFamily="Inter, sans-serif"
                      clipPath={`url(#clip-${task.id})`}
                    >
                      {task.title}
                    </text>
                  )}
                  {/* Clip path for text */}
                  <defs>
                    <clipPath id={`clip-${task.id}`}>
                      <rect x={x + 10} y={y} width={barWidth - 14} height={barHeight} />
                    </clipPath>
                  </defs>
                </g>
              );
            })}

            {/* ── Today line ── */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <g>
                <line
                  x1={todayOffset * DAY_WIDTH}
                  y1={0}
                  x2={todayOffset * DAY_WIDTH}
                  y2={svgHeight}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  opacity={0.7}
                />
                <text
                  x={todayOffset * DAY_WIDTH + 4}
                  y={HEADER_HEIGHT - 6}
                  fontSize={9}
                  fontWeight="700"
                  fill="#ef4444"
                  fontFamily="Inter, sans-serif"
                >
                  วันนี้
                </text>
              </g>
            )}
          </svg>

          {/* ── Floating tooltip ── */}
          {tooltip && (
            <div
              className="absolute z-50 pointer-events-none bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs max-w-[200px]"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <p className="font-bold truncate mb-1">{tooltip.task.title}</p>
              <p className="text-gray-300">
                ครบกำหนด: {tooltip.task.due_date
                  ? new Date(tooltip.task.due_date).toLocaleDateString("th-TH")
                  : "—"}
              </p>
              {tooltip.task.assignments.length > 0 && (
                <p className="text-gray-400 truncate">
                  {tooltip.task.assignments.map((a) => `${a.first_name} ${a.last_name}`).join(", ")}
                </p>
              )}
              <p className="text-gray-400 mt-1">ความคืบหน้า {tooltip.task.progress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-6 px-5 py-3 border-t border-gray-100 bg-gray-50 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
            <span className="text-[10px] font-medium text-gray-500 capitalize">
              {{ pending: "รอดำเนินการ", in_progress: "กำลังทำ", completed: "เสร็จแล้ว", cancelled: "ยกเลิก" }[status] ?? status}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-px border-dashed border border-red-400 inline-block" />
          <span className="text-[10px] font-medium text-gray-500">วันนี้</span>
        </div>
      </div>
    </div>
  );
}
