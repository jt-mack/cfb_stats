/**
 * Live scoreboard is only meaningful for the active (default) season.
 * Prefer SeasonContext.isActive when provided; otherwise fall back to year/phase.
 */
export function shouldUseLiveScoreboard(
  year: number | undefined,
  phase: string | null | undefined,
  defaultSeason: number | undefined,
  isActive?: boolean | null
): boolean {
  if (year == null || Number.isNaN(year)) return false;
  if (defaultSeason == null || Number.isNaN(defaultSeason)) return false;
  if (year !== defaultSeason) return false;
  if (isActive === false) return false;
  return phase === "regular" || phase === "postseason";
}

export function scoreboardStripTitle(
  phase: string | null | undefined,
  currentWeek: number | null | undefined,
  isCurrentSeason: boolean
): string {
  if (phase === "preseason") return "Week 1 Preview";
  if (!isCurrentSeason) {
    return currentWeek != null ? `Week ${currentWeek}` : "Season Games";
  }
  return "This Week";
}
