import { teamIndex } from '../lib/team-index';
import type { Team } from '../lib/types';
import { fetchParsedRankings, parsePollRankMap } from './rankings-repo';
import { fetchSeasonPowerIndex, parsePowerIndexRow } from './ratings-repo';

export type RankSource = 'ap' | 'coaches' | 'cfp' | 'fpi' | 'prior_ap' | 'none';

export type FbsTeamWithRank = Team & {
  rank?: number | null;
  rankLabel?: string;
  rankSource?: RankSource;
};

export class FbsRepo {
  async getFbsTeams(year: number): Promise<Team[]> {
    return teamIndex.getAllTeams(year);
  }

  async getRankingsFromPolls(year: number): Promise<Map<number, number>> {
    try {
      const raw = await fetchParsedRankings(year, {
        cacheKey: `espnRankings:${year}`,
        cacheTtlMs: 15 * 60 * 1000,
      });
      return parsePollRankMap(raw);
    } catch (err) {
      console.warn(`getRankingsFromPolls failed for ${year}:`, err instanceof Error ? err.message : err);
      return new Map();
    }
  }

  async getFpiRankings(year: number): Promise<Map<string, number>> {
    try {
      const rows = await fetchSeasonPowerIndex(year);
      const rankBySchool = new Map<string, number>();
      const teams = await teamIndex.getAllTeams(year);
      const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

      for (const row of rows) {
        const parsed = parsePowerIndexRow(row);
        if (!parsed?.rank) continue;
        const school = idToSchool.get(parsed.teamId);
        if (school) rankBySchool.set(school, parsed.rank);
      }
      return rankBySchool;
    } catch (err) {
      console.warn(`getFpiRankings failed for ${year}:`, err instanceof Error ? err.message : err);
      return new Map();
    }
  }

  async getFbsTeamsWithRankings(year: number): Promise<FbsTeamWithRank[]> {
    const teams = await this.getFbsTeams(year);
    const teamMap = new Map<number, FbsTeamWithRank>(
      teams.map((t) => [t.id, { ...t, rank: null, rankLabel: 'NR', rankSource: 'none' as RankSource }])
    );

    let ranked = false;

    try {
      const rankMap = await this.getRankingsFromPolls(year);
      for (const [teamId, rank] of rankMap) {
        const t = teamMap.get(teamId);
        if (t && rank <= 25) {
          t.rank = rank;
          t.rankSource = 'ap';
          t.rankLabel = `AP #${rank}`;
          ranked = true;
        }
      }
    } catch (err) {
      console.warn(`Poll rankings unavailable for ${year}:`, err instanceof Error ? err.message : err);
    }

    if (!ranked) {
      try {
        const fpiRanks = await this.getFpiRankings(year);
        const schoolToTeam = new Map([...teamMap.values()].map((t) => [t.school, t]));
        for (const [school, rank] of fpiRanks) {
          const team = schoolToTeam.get(school);
          if (team && team.rankSource === 'none') {
            team.rank = rank;
            team.rankSource = 'fpi';
            team.rankLabel = `FPI #${rank}`;
          }
        }
      } catch (err) {
        console.warn(`FPI rankings unavailable for ${year}:`, err instanceof Error ? err.message : err);
      }
    }

    const withRank = Array.from(teamMap.values());
    const hasRank = withRank.filter((t) => t.rank != null && t.rank > 0);
    const noRank = withRank.filter((t) => t.rank == null || t.rank === 0);
    hasRank.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    noRank.sort((a, b) => a.school.localeCompare(b.school));
    return [...hasRank, ...noRank];
  }
}
