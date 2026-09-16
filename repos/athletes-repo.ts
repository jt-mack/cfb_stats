import { athleteCore as fetchAthleteCore, athleteStats as fetchAthleteStats } from '../lib/espn';
import { mapAthleteCore, mapAthleteStats } from '../lib/athlete-mappers';
import type { Athlete, AthleteStats } from '../lib/types';

export class AthletesRepo {
  async getAthlete(athleteId: string): Promise<Athlete | null> {
    let core;
    try {
      core = await fetchAthleteCore(athleteId, {
        cacheKey: `athleteCore:${athleteId}`,
        cacheTtlMs: 60 * 60 * 1000,
      });
    } catch (err) {
      console.warn(`getAthlete failed for ${athleteId}:`, err instanceof Error ? err.message : err);
      return null;
    }

    if (!core?.id) return null;
    return mapAthleteCore(core);
  }

  async getAthleteStats(athleteId: string): Promise<AthleteStats> {
    try {
      const payload = await fetchAthleteStats(athleteId, {
        cacheKey: `athleteStats:${athleteId}`,
        cacheTtlMs: 60 * 60 * 1000,
      });
      return mapAthleteStats(payload);
    } catch (err) {
      console.warn(`getAthleteStats failed for ${athleteId}:`, err instanceof Error ? err.message : err);
      return { categories: [] };
    }
  }
}
