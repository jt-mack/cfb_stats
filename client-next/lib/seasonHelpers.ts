/**
 * Default CFB season year (matches backend lib/sdv getDefaultSeason).
 */
export function getDefaultSeason(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return month <= 2 ? year - 1 : year;
}

export function formatSeasonDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function pickNextGame<T extends { completed?: boolean; startDate?: string }>(
  schedule: T[],
  phase: string | null | undefined
): T | null {
  if (!schedule.length) return null;
  const now = new Date();
  const incomplete = schedule.filter((g) => !g.completed);
  if (!incomplete.length) return null;

  if (phase === "preseason" || phase === "offseason") {
    return [...incomplete].sort(
      (a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime()
    )[0] ?? null;
  }

  const future = incomplete.find((g) => g.startDate && new Date(g.startDate) >= now);
  if (future) return future;

  return [...incomplete].sort(
    (a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime()
  )[0] ?? null;
}
