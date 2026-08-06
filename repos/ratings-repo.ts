import { getCfb, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import type { SdvParsedPowerIndexRow, SdvPredictiveMetric, SdvTeamScheduleResponse } from '../lib/espn-types';
import { teamIndex } from '../lib/team-index';
import type { AdvancedSeasonStat, GameWithOdds, PregameWinProbability } from '../lib/types';

export type TeamRatingEntry = {
  team: string;
  ranking: number;
  rating: number;
  source: 'espn_fpi' | 'espn_efficiency';
  label: string;
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
  const idMatch = ref.match(/teams\/(\d+)/);
  return idMatch ? parseInt(idMatch[1], 10) : null;
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

export function fetchSeasonPowerIndex(
  season: number,
  options?: SdvRequestOptions
): Promise<SdvParsedPowerIndexRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbSeasonPowerindex({ season, parsed: true })) as SdvParsedPowerIndexRow[];
  }, {
    cacheKey: `seasonPowerIndex:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

function fetchTeamScheduleRaw(
  params: { teamId: number | string; season: number },
  options?: SdvRequestOptions
): Promise<SdvTeamScheduleResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamSchedule({
      team_id: String(params.teamId),
      season: params.season,
    })) as SdvTeamScheduleResponse;
  }, options);
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
        const ref = String(row.team_$ref ?? '');
        const idMatch = ref.match(/teams\/(\d+)/);
        const school = idMatch ? idToSchool.get(parseInt(idMatch[1], 10)) : undefined;
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

  async getTeamAts(year: number, team?: string) {
    if (!team) return [];

    const teamId = await teamIndex.resolveTeamId(team, year);
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    if (!teamId) return [];

    try {
      const schedule = await fetchTeamScheduleRaw({ teamId, season: year });
      const events = schedule.events ?? [];

      let covers = 0;
      let pushes = 0;
      let total = 0;

      for (const event of events) {
        const comp = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
        const odds = (comp?.odds as { spread?: number }[] | undefined)?.[0];
        if (odds?.spread == null) continue;

        const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
        const home = competitors.find((c) => c.homeAway === 'home');
        const away = competitors.find((c) => c.homeAway === 'away');
        const homeTeamInfo = home?.team as { location?: string; displayName?: string } | undefined;
        const awayTeamInfo = away?.team as { location?: string; displayName?: string } | undefined;
        const homeName = homeTeamInfo?.location ?? homeTeamInfo?.displayName ?? '';
        const awayName = awayTeamInfo?.location ?? awayTeamInfo?.displayName ?? '';
        const isHome = homeName.toLowerCase() === school.toLowerCase();
        const isAway = awayName.toLowerCase() === school.toLowerCase();
        if (!isHome && !isAway) continue;

        const homeScore = Number((home?.score as { value?: number })?.value ?? home?.score);
        const awayScore = Number((away?.score as { value?: number })?.value ?? away?.score);
        if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

        total++;
        const margin = homeScore - awayScore;
        const spread = odds.spread;
        const adjusted = isHome ? margin + spread : -(margin + spread);

        if (adjusted > 0) covers++;
        else if (adjusted === 0) pushes++;
      }

      const decisions = total - pushes;
      return [{
        team,
        year,
        games: total,
        covers,
        pushes,
        coverPct: decisions ? covers / decisions : 0,
      }];
    } catch (err) {
      console.warn(`getTeamAts failed for ${team} ${year}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getTeamRatings(year: number, team: string) {
    const [fpi, efficiency, ats] = await Promise.all([
      this.getFpiRatings(year),
      this.getEfficiencyRatings(year),
      this.getTeamAts(year, team),
    ]);

    return {
      fpi: fpi.find((r) => r.team === team) ?? null,
      efficiency: efficiency.find((r) => r.team === team) ?? null,
      ats: ats[0] ?? null,
    };
  }
}

function extractOddsFromRawSchedule(
  events: Record<string, unknown>[],
  games: import('../lib/types').Game[]
): GameWithOdds[] {
  const oddsByGameId = new Map<number, PregameWinProbability>();

  for (const event of events) {
    const comp = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
    const gameId = Number(event.id);
    const oddsArr = comp?.odds as
      | { spread?: number; homeTeamOdds?: { winPercentage?: number } }[]
      | undefined;
    const first = oddsArr?.[0];
    if (!first || !gameId) continue;

    const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    const homeTeam = (home?.team as { location?: string; displayName?: string })?.location
      ?? (home?.team as { displayName?: string })?.displayName
      ?? '';
    const awayTeam = (away?.team as { location?: string; displayName?: string })?.location
      ?? (away?.team as { displayName?: string })?.displayName
      ?? '';

    oddsByGameId.set(gameId, {
      gameId,
      homeTeam,
      awayTeam,
      spread: first.spread ?? 0,
      homeWinProbability: first.homeTeamOdds?.winPercentage ?? 0.5,
    });
  }

  return games.map((g) => ({ ...g, odds: oddsByGameId.get(g.id) }));
}

export { extractOddsFromRawSchedule };
