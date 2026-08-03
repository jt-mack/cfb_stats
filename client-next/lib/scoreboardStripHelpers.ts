/**
 * Live scoreboard is only meaningful for the active (default) season.
 * Historical seasons must use week-scoped games even if phase is regular/postseason.
 */
export function shouldUseLiveScoreboard(
  year: number | undefined,
  phase: string | null | undefined,
  defaultSeason: number | undefined
): boolean {
  if (year == null || Number.isNaN(year)) return false;
  if (defaultSeason == null || Number.isNaN(defaultSeason)) return false;
  if (year !== defaultSeason) return false;
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
