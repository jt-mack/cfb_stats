import { getCfb, getSdv, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import { teamIndex } from '../lib/team-index';
import { fetchSeasonPowerIndex, parsePowerIndexRow } from './ratings-repo';

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

/** Try 247Sports composite team rankings; returns [] on upstream failure. */
async function fetchCompositeTeamRankings(
  year: number,
  options?: SdvRequestOptions
): Promise<TeamRecruitingRow[]> {
  return sdvRequest(async () => {
    const sdv = await getSdv();
    const recruiting = sdv.recruiting as Record<
      string,
      (params: Record<string, unknown>) => Promise<Record<string, unknown>[]>
    >;
    const rows = await recruiting.sports247RankingsCompositeTeamFeed({
      sport_key: 'Football',
      year,
      page_size: 500,
      parsed: true,
    });
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return rows
      .map((row) => {
        const team =
          String(row.institution_name ?? row.institutionName ?? row.team ?? row.school ?? '').trim();
        const rank = Number(row.rank ?? row.ranking ?? row.overall_rank ?? 0);
        const points = Number(row.rating ?? row.points ?? row.score ?? row.total_score ?? 0);
        if (!team || !rank) return null;
        return { year, team, rank, points, source: '247sports' as const };
      })
      .filter(Boolean) as TeamRecruitingRow[];
  }, {
    cacheKey: options?.cacheKey ?? `recruiting247:${year}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs ?? 8_000,
  }).catch((err) => {
    console.warn(`247Sports recruiting unavailable for ${year}:`, err instanceof Error ? err.message : err);
    return [] as TeamRecruitingRow[];
  });
}

/** Try 247Sports institution talent composite; returns [] on upstream failure. */
async function fetchInstitutionTalent(
  year: number,
  options?: SdvRequestOptions
): Promise<TeamTalentRow[]> {
  return sdvRequest(async () => {
    const sdv = await getSdv();
    const recruiting = sdv.recruiting as Record<
      string,
      (params: Record<string, unknown>) => Promise<Record<string, unknown>[]>
    >;
    const rows = await recruiting.sports247InstitutionRankings({
      sport_key: 'Football',
      year,
      ranking_type: 'Talent',
      page_size: 500,
      parsed: true,
    });
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return rows
      .map((row) => {
        const team = String(row.institution_name ?? row.institutionName ?? row.team ?? '').trim();
        const talent = Number(row.rating ?? row.talent ?? row.score ?? row.points ?? 0);
        const teamId = Number(row.institution_id ?? row.team_id ?? 0);
        if (!team || !talent) return null;
        return {
          year,
          teamId: teamId || 0,
          team,
          talent,
          source: '247sports' as const,
        };
      })
      .filter(Boolean) as TeamTalentRow[];
  }, {
    cacheKey: options?.cacheKey ?? `talent247:${year}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs ?? 8_000,
  }).catch((err) => {
    console.warn(`247Sports talent unavailable for ${year}:`, err instanceof Error ? err.message : err);
    return [] as TeamTalentRow[];
  });
}

export class DeepStatsRepo {
  async getDrivesForGame(gameId: number) {
    try {
      return await sdvRequest(async () => {
        const cfb = await getCfb();
        const raw = (await cfb.espnCfbSummary({ event_id: gameId })) as {
          drives?: { previous?: unknown[]; current?: unknown[] };
        };
        return [...(raw.drives?.previous ?? []), ...(raw.drives?.current ?? [])];
      }, {
        cacheKey: `gameSummaryRaw:${gameId}`,
        cacheTtlMs: 60 * 60 * 1000,
      });
    } catch (err) {
      console.warn(`getDrivesForGame failed for ${gameId}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getPlaysForGame(gameId: number) {
    try {
      return await sdvRequest(async () => {
        const cfb = await getCfb();
        const raw = (await cfb.espnCfbSummary({ event_id: gameId })) as {
          drives?: { previous?: { plays?: unknown[] }[]; current?: { plays?: unknown[] }[] };
        };
        return [...(raw.drives?.previous ?? []), ...(raw.drives?.current ?? [])].flatMap(
          (d) => d.plays ?? []
        );
      }, {
        cacheKey: `gameSummaryRaw:${gameId}`,
        cacheTtlMs: 60 * 60 * 1000,
      });
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
}
