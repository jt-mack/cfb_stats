import { GamesRepo } from './games-repo';
import { routeCache } from '../lib/cache';
import type { Game, Matchup } from '../lib/types';

/** How many prior seasons to include when calculating head-to-head series. */
export const SERIES_LOOKBACK_YEARS = 15;

export function buildMatchupFromSchedules(
  team1: string,
  team2: string,
  schedule1: Game[],
  schedule2: Game[]
): Matchup {
  const allGames = [...schedule1, ...schedule2];
  const h2h = allGames.filter(
    (g) =>
      (g.homeTeam === team1 && g.awayTeam === team2) || (g.homeTeam === team2 && g.awayTeam === team1)
  );
  const seen = new Set<number>();
  const unique = h2h.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return g.completed;
  });

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  const games = unique.map((g) => {
    const homeScore = g.homePoints;
    const awayScore = g.awayPoints;
    if (homeScore != null && awayScore != null) {
      const team1Home = g.homeTeam === team1;
      const team1Score = team1Home ? homeScore : awayScore;
      const team2Score = team1Home ? awayScore : homeScore;
      if (team1Score > team2Score) team1Wins++;
      else if (team2Score > team1Score) team2Wins++;
      else ties++;
    }
    return {
      season: g.season,
      date: g.startDate,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore,
      awayScore,
    };
  });

  const seasons = games.map((g) => g.season).filter((y) => Number.isFinite(y));
  const sinceSeason = seasons.length ? Math.min(...seasons) : undefined;

  return { team1, team2, team1Wins, team2Wins, ties, sinceSeason, games };
}

export class MatchupSeriesRepo {
  private gamesRepo = new GamesRepo();

  async getSeries(
    team1: string,
    team2: string,
    throughSeason: number,
    lookback = SERIES_LOOKBACK_YEARS
  ): Promise<Matchup> {
    const sinceSeason = throughSeason - lookback + 1;
    const cacheKey = `series_${team1}_${team2}_${sinceSeason}_${throughSeason}`;
    const cached = routeCache.get<Matchup>(cacheKey);
    if (cached) return cached;

    const seasons = Array.from({ length: lookback }, (_, i) => throughSeason - i);
    const schedules: Game[] = [];

    // Pull one team's schedules across seasons (fewer calls than both teams).
    for (const season of seasons) {
      try {
        const games = await this.gamesRepo.getSchedule(team1, season);
        schedules.push(...games);
      } catch (err) {
        console.warn(
          `Series schedule ${team1} ${season} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const matchup = buildMatchupFromSchedules(team1, team2, schedules, []);
    matchup.sinceSeason = sinceSeason;
    matchup.games.sort((a, b) => b.season - a.season || b.date.localeCompare(a.date));

    routeCache.set(cacheKey, matchup, 24 * 60 * 60);
    return matchup;
  }
}
