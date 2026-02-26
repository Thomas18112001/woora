export function computeDurationSeconds(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

export function getRangeStart(range: "today" | "week" | "month"): Date {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}
