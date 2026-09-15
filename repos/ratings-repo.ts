import { institutionTalent, recruitingComposite, seasonPowerIndex, type SdvRequestOptions } from '../lib/espn';
import type { SdvParsedPowerIndexRow, SdvPredictiveMetric } from '../lib/espn-types';
import { teamIndex } from '../lib/team-index';
import type { AdvancedSeasonStat } from '../lib/types';
import { idFromRef } from '../utils/parse';

export type TeamRatingEntry = {
  team: string;
  ranking: number;
  rating: number;
  source: 'espn_fpi' | 'espn_efficiency';
  label: string;
};

export type TeamRecruitingRow = {
  year: number;
  team: string;
  rank: number;
  points: number;
  source: '247sports' | 'espn_fpi_estimate';
};

export type TeamTalentRow = {
  year: number;
  teamId: number;
  team: string;
  talent: number;
  source: '247sports' | 'espn_fpi';
};

function parseEfficiencyJson(raw: unknown): Record<string, number> {
  if (typeof raw !== 'string') return {};
  try {
    const arr = JSON.parse(raw) as SdvPredictiveMetric[];
    const out: Record<string, number> = {};
    for (const item of arr) {
      if (item.name && item.value != null) out[item.name] = item.value;
    }
    return out;
  } catch {
    return {};
  }
}

export function teamIdFromRef(ref: string): number | null {
  return idFromRef(ref, 'teams');
}

export function parsePowerIndexRow(row: SdvParsedPowerIndexRow): {
  teamId: number;
  rank: number;
  fpi: number;
} | null {
  const teamId = teamIdFromRef(String(row.team_$ref ?? ''));
  if (teamId == null) return null;
  try {
    const predictives = JSON.parse(row.predictives ?? '[]') as SdvPredictiveMetric[];
    const rank = predictives.find((p) => p.name === 'fpirank')?.value ?? 0;
    const fpi = predictives.find((p) => p.name === 'fpi')?.value ?? 0;
    return { teamId, rank, fpi };
  } catch {
    return null;
  }
}

export function mapPowerIndexToAdvancedStats(
  rows: SdvParsedPowerIndexRow[],
  season: number,
  teamIds: Map<number, string>
): AdvancedSeasonStat[] {
  return rows
    .map((row) => {
      const teamId = teamIdFromRef(String(row.team_$ref ?? ''));
      const school = teamId != null ? teamIds.get(teamId) : null;
      if (!school) return null;
      const eff = parseEfficiencyJson(row.efficiencies);
      return {
        team: school,
        season,
        offenseEfficiency: eff.offefficiency ?? 0,
        defenseEfficiency: eff.defefficiency ?? 0,
      };
    })
    .filter(Boolean) as AdvancedSeasonStat[];
}

export function fetchSeasonPowerIndex(season: number, options?: SdvRequestOptions) {
  return seasonPowerIndex(season, {
    cacheKey: options?.cacheKey ?? `seasonPowerIndex:all:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

export class RatingsRepo {
  async getFpiRatings(year: number): Promise<TeamRatingEntry[]> {
    try {
      const rows = await fetchSeasonPowerIndex(year);
      const teams = await teamIndex.getAllTeams(year);
      const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

      return rows.map((row) => {
        const parsed = parsePowerIndexRow(row);
        const school = parsed ? idToSchool.get(parsed.teamId) : undefined;
        return {
          team: school ?? 'Unknown',
          ranking: parsed?.rank ?? 0,
          rating: parsed?.fpi ?? 0,
          source: 'espn_fpi' as const,
          label: 'ESPN FPI',
        };
      });
    } catch (err) {
      console.warn(`getFpiRatings failed for ${year}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getEfficiencyRatings(year: number): Promise<TeamRatingEntry[]> {
    try {
      const rows = await fetchSeasonPowerIndex(year);
      const teams = await teamIndex.getAllTeams(year);
      const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

      return rows.map((row) => {
        const teamId = teamIdFromRef(String(row.team_$ref ?? ''));
        const school = teamId != null ? idToSchool.get(teamId) : undefined;
        let ranking = 0;
        let rating = 0;
        try {
          const eff = JSON.parse(row.efficiencies ?? '[]') as SdvPredictiveMetric[];
          ranking = eff.find((p) => p.name === 'totefficiencyrank')?.value ?? 0;
          rating = eff.find((p) => p.name === 'totefficiency')?.value ?? 0;
        } catch {
          // skip malformed efficiency JSON
        }
        return {
          team: school ?? 'Unknown',
          ranking,
          rating,
          source: 'espn_efficiency' as const,
          label: 'ESPN Total Efficiency',
        };
      });
    } catch (err) {
      console.warn(`getEfficiencyRatings failed for ${year}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getTalent(year: number): Promise<TeamTalentRow[]> {
    try {
      const rows = await institutionTalent(year, {
        cacheKey: `talent247:${year}`,
        cacheTtlMs: 24 * 60 * 60 * 1000,
        timeoutMs: 8_000,
      });
      const talent247 = rows
        .map((row) => {
          const team = String(row.institution_name ?? row.institutionName ?? row.team ?? '').trim();
          const talent = Number(row.rating ?? row.talent ?? row.score ?? row.points ?? 0);
          const teamId = Number(row.institution_id ?? row.team_id ?? 0);
          if (!team || !talent) return null;
          return { year, teamId: teamId || 0, team, talent, source: '247sports' as const };
        })
        .filter(Boolean) as TeamTalentRow[];
      if (talent247.length > 0) return talent247;
    } catch (err) {
      console.warn(`247Sports talent unavailable for ${year}:`, err instanceof Error ? err.message : err);
    }

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
      .filter(Boolean) as TeamTalentRow[];
  }

  async getRecruitingRankings(year: number): Promise<TeamRecruitingRow[]> {
    try {
      const rows = await recruitingComposite(year, {
        cacheKey: `recruiting247:${year}`,
        cacheTtlMs: 24 * 60 * 60 * 1000,
        timeoutMs: 8_000,
      });
      const real = rows
        .map((row) => {
          const team = String(row.institution_name ?? row.institutionName ?? row.team ?? row.school ?? '').trim();
          const rank = Number(row.rank ?? row.ranking ?? row.overall_rank ?? 0);
          const points = Number(row.rating ?? row.points ?? row.score ?? row.total_score ?? 0);
          if (!team || !rank) return null;
          return { year, team, rank, points, source: '247sports' as const };
        })
        .filter(Boolean) as TeamRecruitingRow[];
      if (real.length > 0) return real;
    } catch (err) {
      console.warn(`247Sports recruiting unavailable for ${year}:`, err instanceof Error ? err.message : err);
    }

    const rows = await fetchSeasonPowerIndex(year).catch(() => []);
    const teams = await teamIndex.getAllTeams(year);
    const idToSchool = new Map(teams.map((t) => [t.id, t.school]));
    return rows
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
      .sort((a, b) => (a!.rank ?? 999) - (b!.rank ?? 999)) as TeamRecruitingRow[];
  }
}
