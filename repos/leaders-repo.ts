import { getCfb, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import { POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import { teamIndex } from '../lib/team-index';
import type { LeaderEntry } from '../lib/types';

const PREFERRED_CATEGORIES = [
  'passingYards',
  'passingTouchdowns',
  'rushingYards',
  'rushingTouchdowns',
  'receivingYards',
  'receivingTouchdowns',
  'receptions',
  'totalTackles',
  'sacks',
  'interceptions',
] as const;

type SeasonLeadersPayload = {
  categories?: Array<{
    name?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    leaders?: Array<{
      displayValue?: string;
      value?: number;
      athlete?: { '$ref'?: string };
      team?: { '$ref'?: string };
    }>;
  }>;
};

function idFromRef(ref: string | undefined | null, kind: 'athletes' | 'teams' | 'coaches'): number | null {
  if (!ref) return null;
  const re = new RegExp(`${kind}/(\\d+)`);
  const m = ref.match(re);
  return m ? Number(m[1]) : null;
}

function fetchSeasonTypeLeaders(
  season: number,
  seasonType = REGULAR_SEASON_TYPE,
  options?: SdvRequestOptions
): Promise<SeasonLeadersPayload> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbSeasonTypeLeaders({
      season,
      season_type: seasonType,
    })) as SeasonLeadersPayload;
  }, {
    cacheKey: `seasonTypeLeaders:${season}:${seasonType}`,
    cacheTtlMs: options?.cacheTtlMs ?? 30 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

async function fetchAthleteDisplayName(
  athleteId: number,
  season: number,
  options?: SdvRequestOptions
): Promise<{ id: number; name: string; position: string | null }> {
  return sdvRequest(async () => {
    const axios = (await import('axios')).default;
    const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}/athletes/${athleteId}?lang=en&region=us`;
    const res = await axios.get(url, { timeout: 8_000 });
    const data = res.data as {
      id?: string | number;
      displayName?: string;
      fullName?: string;
      position?: { abbreviation?: string };
    };
    return {
      id: Number(data.id ?? athleteId),
      name: data.displayName ?? data.fullName ?? `Athlete ${athleteId}`,
      position: data.position?.abbreviation ?? null,
    };
  }, {
    cacheKey: `athleteName:${season}:${athleteId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs ?? 8_000,
  });
}

export class LeadersRepo {
  async resolveLeadersSeason(requested: number): Promise<{ season: number; seasonType: number }> {
    const candidates = [requested, requested - 1];
    for (const season of candidates) {
      for (const seasonType of [POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE]) {
        try {
          const payload = await fetchSeasonTypeLeaders(season, seasonType);
          if (payload.categories?.length) return { season, seasonType };
        } catch {
          // try next
        }
      }
    }
    return { season: requested, seasonType: REGULAR_SEASON_TYPE };
  }

  async getSeasonLeaders(
    season: number,
    category?: string,
    limit = 25
  ): Promise<{ season: number; categories: string[]; leaders: LeaderEntry[] }> {
    const resolved = await this.resolveLeadersSeason(season);
    let payload;
    try {
      payload = await fetchSeasonTypeLeaders(resolved.season, resolved.seasonType);
    } catch (err) {
      console.warn('Season leaders unavailable:', err instanceof Error ? err.message : err);
      return { season: resolved.season, categories: [], leaders: [] };
    }

    const categories = (payload.categories ?? [])
      .map((c) => c.name)
      .filter(Boolean) as string[];

    const ordered = [
      ...PREFERRED_CATEGORIES.filter((c) => categories.includes(c)),
      ...categories.filter((c) => !PREFERRED_CATEGORIES.includes(c as (typeof PREFERRED_CATEGORIES)[number])),
    ];

    const targetCategories = category ? [category] : ordered.slice(0, 1);
    const cat = (payload.categories ?? []).find((c) => c.name === targetCategories[0]);
    if (!cat?.leaders?.length) {
      return { season: resolved.season, categories: ordered, leaders: [] };
    }

    const teams = await teamIndex.getAllTeams(resolved.season);
    const schoolById = new Map(teams.map((t) => [t.id, t.school]));

    const slice = cat.leaders.slice(0, limit);
    const leaders: LeaderEntry[] = [];

    await Promise.all(
      slice.map(async (entry, index) => {
        const athleteId = idFromRef(entry.athlete?.['$ref'], 'athletes');
        const teamId = idFromRef(entry.team?.['$ref'], 'teams') ?? 0;
        if (!athleteId) return;
        let name = `Athlete ${athleteId}`;
        let position: string | null = null;
        try {
          const ath = await fetchAthleteDisplayName(athleteId, resolved.season);
          name = ath.name;
          position = ath.position;
        } catch {
          // keep fallback name
        }
        leaders.push({
          rank: index + 1,
          playerId: String(athleteId),
          player: name,
          teamId,
          team: schoolById.get(teamId) ?? `Team ${teamId}`,
          position,
          category: cat.name ?? targetCategories[0],
          categoryDisplay: cat.displayName ?? cat.name ?? targetCategories[0],
          value: Number(entry.value ?? 0),
          displayValue: String(entry.displayValue ?? entry.value ?? ''),
          season: resolved.season,
        });
      })
    );

    leaders.sort((a, b) => a.rank - b.rank);
    return { season: resolved.season, categories: ordered, leaders };
  }

  async getTeamLeaders(teamId: number, season: number): Promise<LeaderEntry[]> {
    const resolved = await this.resolveLeadersSeason(season);
    let payload;
    try {
      payload = await fetchSeasonTypeLeaders(resolved.season, resolved.seasonType);
    } catch {
      return [];
    }

    const teams = await teamIndex.getAllTeams(resolved.season);
    const schoolById = new Map(teams.map((t) => [t.id, t.school]));
    const out: LeaderEntry[] = [];

    for (const cat of payload.categories ?? []) {
      if (!cat.name || !PREFERRED_CATEGORIES.includes(cat.name as (typeof PREFERRED_CATEGORIES)[number])) {
        continue;
      }
      const match = (cat.leaders ?? []).find(
        (l) => idFromRef(l.team?.['$ref'], 'teams') === teamId
      );
      if (!match) continue;
      const athleteId = idFromRef(match.athlete?.['$ref'], 'athletes');
      if (!athleteId) continue;
      let name = `Athlete ${athleteId}`;
      let position: string | null = null;
      try {
        const ath = await fetchAthleteDisplayName(athleteId, resolved.season);
        name = ath.name;
        position = ath.position;
      } catch {
        // ignore
      }
      out.push({
        rank: 1,
        playerId: String(athleteId),
        player: name,
        teamId,
        team: schoolById.get(teamId) ?? `Team ${teamId}`,
        position,
        category: cat.name,
        categoryDisplay: cat.displayName ?? cat.name,
        value: Number(match.value ?? 0),
        displayValue: String(match.displayValue ?? match.value ?? ''),
        season: resolved.season,
      });
    }

    return out;
  }
}
