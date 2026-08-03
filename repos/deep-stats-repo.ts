import {
  fetchCompositeTeamRankings,
  fetchInstitutionTalent,
} from '../lib/sdv/recruiting';
import {
  fetchGameDrives,
  fetchGamePlays,
  fetchSeasonPowerIndex,
  parsePowerIndexRow,
} from '../lib/sdv';
import { teamIndex } from '../lib/team-index';

export class DeepStatsRepo {
  async getDrivesForGame(_season: number, _week: number, gameId: number) {
    try {
      return await fetchGameDrives(gameId);
    } catch (err) {
      console.warn(`getDrivesForGame failed for ${gameId}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getPlaysForGame(_season: number, _week: number, gameId: number) {
    try {
      return await fetchGamePlays(gameId);
    } catch (err) {
      console.warn(`getPlaysForGame failed for ${gameId}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getTalent(year: number) {
    const talent247 = await fetchInstitutionTalent(year);
    if (talent247.length > 0) return talent247;

    const rows = await fetchSeasonPowerIndex(year).catch(() => []);
    const teams = await teamIndex.getAllTeams(year);
    const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

    return rows
      .map((row) => {
        const parsed = parsePowerIndexRow(row);
        if (!parsed) return null;
        const school = idToSchool.get(parsed.teamId);
        if (!school) return null;
        return {
          year,
          teamId: parsed.teamId,
          team: school,
          talent: parsed.fpi,
          source: 'espn_fpi' as const,
        };
      })
      .filter(Boolean);
  }

  async getRecruitingRankings(year: number, team?: string) {
    const real = await fetchCompositeTeamRankings(year);
    if (real.length > 0) {
      return team ? real.filter((r) => r.team === team) : real;
    }

    // Fallback: FPI rank labeled as estimate when 247Sports is unavailable
    const rows = await fetchSeasonPowerIndex(year).catch(() => []);
    const teams = await teamIndex.getAllTeams(year);
    const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

    const rankings = rows
      .map((row) => {
        const parsed = parsePowerIndexRow(row);
        if (!parsed?.rank) return null;
        const school = idToSchool.get(parsed.teamId);
        if (!school) return null;
        return {
          year,
          team: school,
          rank: parsed.rank,
          points: parsed.fpi,
          source: 'espn_fpi_estimate' as const,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.rank ?? 999) - (b!.rank ?? 999)) as {
      year: number;
      team: string;
      rank: number;
      points: number;
      source: 'espn_fpi_estimate';
    }[];

    return team ? rankings.filter((r) => r.team === team) : rankings;
  }

  /** Roster experience estimate — not true returning production. */
  async getReturningProduction(year: number, team?: string) {
    if (!team) return [];
    const roster = await teamIndex.resolveTeamId(team, year);
    if (!roster) return [];

    return [{
      team,
      year,
      totalPPA: null,
      percentPPA: null,
      usage: null,
      label: 'Returning production data unavailable',
      isEstimate: true,
    }];
  }
}
