import { ATHLETE_URL, espnGet, seasonTypeLeaders } from '../lib/espn';
import { REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import { teamIndex } from '../lib/team-index';
import type { LeaderEntry } from '../lib/types';
import { idFromRef } from '../utils/parse';

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

export class LeadersRepo {
  async getSeasonLeaders(
    season: number,
    category?: string,
    limit = 25
  ): Promise<{ season: number; categories: string[]; leaders: LeaderEntry[] }> {
    let payload;
    try {
      payload = await seasonTypeLeaders(
        { season, seasonType: REGULAR_SEASON_TYPE },
        { cacheKey: `seasonTypeLeaders:${season}:${REGULAR_SEASON_TYPE}`, cacheTtlMs: 30 * 60 * 1000 }
      );
    } catch (err) {
      console.warn('Season leaders unavailable:', err instanceof Error ? err.message : err);
      return { season, categories: [], leaders: [] };
    }

    const categories = (payload.categories ?? []).map((c) => c.name).filter(Boolean) as string[];
    const ordered = [
      ...PREFERRED_CATEGORIES.filter((c) => categories.includes(c)),
      ...categories.filter((c) => !PREFERRED_CATEGORIES.includes(c as (typeof PREFERRED_CATEGORIES)[number])),
    ];

    const targetCategories = category ? [category] : ordered.slice(0, 1);
    const cat = (payload.categories ?? []).find((c) => c.name === targetCategories[0]);
    if (!cat?.leaders?.length) {
      return { season, categories: ordered, leaders: [] };
    }

    const teams = await teamIndex.getAllTeams(season);
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
          const ath = await espnGet<{
            id?: string | number;
            displayName?: string;
            fullName?: string;
            position?: { abbreviation?: string };
          }>(ATHLETE_URL(season, athleteId), {
            cacheKey: `athleteName:${season}:${athleteId}`,
            cacheTtlMs: 24 * 60 * 60 * 1000,
            timeoutMs: 8_000,
          });
          name = ath.displayName ?? ath.fullName ?? name;
          position = ath.position?.abbreviation ?? null;
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
          season,
        });
      })
    );

    leaders.sort((a, b) => a.rank - b.rank);
    return { season, categories: ordered, leaders };
  }
}
