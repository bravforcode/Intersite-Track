export function formatDate(d: string): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: string): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatProgress(progress: number): string {
  return `${Math.min(100, Math.max(0, progress))}%`;
}
