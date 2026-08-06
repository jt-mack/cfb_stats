import { getCfb, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import { FBS_GROUP, POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import type { SdvParsedScoreboardRow } from '../lib/espn-types';
import { mapParsedScoreboardRow } from '../lib/schedule-service';
import { GamesRepo } from './games-repo';
import type { CalendarWeek, Game } from '../lib/types';

type SeasonWeekInfo = {
  week: number;
  startDate: string;
  endDate: string;
  text?: string;
  seasonType: number;
};

type SeasonWeeksList = { items?: Array<{ '$ref'?: string }> };

async function fetchSeasonWeeks(
  season: number,
  seasonType: number,
  options?: SdvRequestOptions
): Promise<SeasonWeekInfo[]> {
  const list = (await sdvRequest(async () => {
    const cfb = await getCfb();
    return cfb.espnCfbSeasonWeeks({ season, season_type: seasonType }) as SeasonWeeksList;
  }, {
    cacheKey: `seasonWeeksList:${season}:${seasonType}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  })) as SeasonWeeksList;

  const weeks: SeasonWeekInfo[] = [];
  for (const item of list.items ?? []) {
    const ref = item['$ref'];
    const weekNum = ref?.match(/weeks\/(\d+)/)?.[1];
    if (!ref || !weekNum) continue;

    try {
      const detail = await sdvRequest(
        async () => {
          const axios = (await import('axios')).default;
          const res = await axios.get(ref, { timeout: 8_000 });
          return res.data as { number?: number; startDate?: string; endDate?: string; text?: string };
        },
        {
          cacheKey: `seasonWeekDetail:${season}:${seasonType}:${weekNum}`,
          cacheTtlMs: 24 * 60 * 60 * 1000,
          timeoutMs: 8_000,
        }
      );
      if (detail.startDate && detail.endDate) {
        weeks.push({
          week: detail.number ?? Number(weekNum),
          startDate: detail.startDate,
          endDate: detail.endDate,
          text: detail.text,
          seasonType,
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch week ${weekNum} for ${season}:`, err instanceof Error ? err.message : err);
    }
  }

  return weeks.sort((a, b) => a.week - b.week);
}

export class ScoreboardRepo {
  private gamesRepo = new GamesRepo();

  async getLiveScoreboard(): Promise<Game[]> {
    const rows = await sdvRequest(async () => {
      const cfb = await getCfb();
      return (await cfb.espnCfbScoreboard({
        groups: FBS_GROUP,
        limit: 100,
        parsed: true,
      })) as SdvParsedScoreboardRow[];
    }, { cacheKey: 'liveScoreboard', cacheTtlMs: 60 * 1000 });
    return rows.map((r) => mapParsedScoreboardRow(r, r.season_type ?? REGULAR_SEASON_TYPE));
  }

  async getCalendar(year: number): Promise<CalendarWeek[]> {
    const weeks: CalendarWeek[] = [];

    for (const seasonType of [REGULAR_SEASON_TYPE, POSTSEASON_SEASON_TYPE]) {
      const seasonTypeLabel = seasonType === POSTSEASON_SEASON_TYPE ? 'postseason' : 'regular';
      try {
        const seasonWeeks = await fetchSeasonWeeks(year, seasonType);
        for (const w of seasonWeeks) {
          weeks.push({
            season: year,
            week: w.week,
            seasonType: seasonTypeLabel,
            startDate: w.startDate,
            endDate: w.endDate,
          });
        }
      } catch (err) {
        console.warn(`Calendar fetch failed for ${year} type ${seasonType}:`, err instanceof Error ? err.message : err);
      }
    }

    return weeks.sort((a, b) => {
      if (a.seasonType !== b.seasonType) return a.seasonType === 'regular' ? -1 : 1;
      return a.week - b.week;
    });
  }

  async getWeekGames(
    year: number,
    week: number,
    seasontype: number = REGULAR_SEASON_TYPE
  ): Promise<Game[]> {
    return this.gamesRepo.getWeekGamesFromScoreboard(year, week, seasontype);
  }
}
