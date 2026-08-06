import { getCfb, getDefaultSeason, sdvRequest } from '../lib/espn-client';
import { FBS_GROUP } from '../lib/espn-constants';
import type { SdvStandingsResponse } from '../lib/espn-types';
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
      const rankMap = parsePollRankMap(raw);
      if (rankMap.size > 0) return rankMap;
    } catch (err) {
      console.warn(`getRankingsFromPolls failed for ${year}:`, err instanceof Error ? err.message : err);
    }
    return this.getRankingsFromStandings(year);
  }

  async getRankingsFromStandings(year: number): Promise<Map<number, number>> {
    const standings = await sdvRequest(async () => {
      const cfb = await getCfb();
      return (await cfb.espnCfbStandings({ season: year, group: FBS_GROUP })) as SdvStandingsResponse;
    }, {
      cacheKey: `fbsStandingsRaw:${year}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    const entries = standings.standings?.entries ?? [];
    const rankMap = new Map<number, number>();
    for (const entry of entries) {
      const id = Number(entry.team?.id);
      const rank = entry.team?.rank;
      if (id && rank && rank > 0 && rank <= 99) rankMap.set(id, rank);
    }
    return rankMap;
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
    const defaultSeason = getDefaultSeason();
    const isCurrentOrFuture = year >= defaultSeason;

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
          t.rankLabel = isCurrentOrFuture ? `AP #${rank}` : `AP #${rank}`;
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
        ranked = fpiRanks.size > 0;
      } catch (err) {
        console.warn(`FPI rankings unavailable for ${year}:`, err instanceof Error ? err.message : err);
      }
    }

    if (!ranked) {
      try {
        const priorRankMap = await this.getRankingsFromStandings(year - 1);
        for (const [teamId, rank] of priorRankMap) {
          const t = teamMap.get(teamId);
          if (t && t.rankSource === 'none' && rank <= 25) {
            t.rank = rank;
            t.rankSource = 'prior_ap';
            t.rankLabel = `${year - 1} Final #${rank}`;
          }
        }
      } catch (err) {
        console.warn(`Prior-year rankings unavailable:`, err instanceof Error ? err.message : err);
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
