import { espnGet, scoreboard, seasonWeeks, type SdvRequestOptions } from '../lib/espn';
import { POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import { eventsToGames } from '../lib/game-mappers';
import type { CalendarWeek, Game } from '../lib/types';

type SeasonWeekInfo = {
  week: number;
  startDate: string;
  endDate: string;
  text?: string;
  seasonType: number;
};

async function fetchSeasonWeekDetails(
  season: number,
  seasonType: number,
  options?: SdvRequestOptions
): Promise<SeasonWeekInfo[]> {
  const list = await seasonWeeks(
    { season, seasonType },
    {
      cacheKey: `seasonWeeksList:${season}:${seasonType}`,
      cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
      timeoutMs: options?.timeoutMs,
    }
  );

  const weeks: SeasonWeekInfo[] = [];
  for (const item of list.items ?? []) {
    const ref = item['$ref'];
    const weekNum = ref?.match(/weeks\/(\d+)/)?.[1];
    if (!ref || !weekNum) continue;

    try {
      const detail = await espnGet<{ number?: number; startDate?: string; endDate?: string; text?: string }>(
        ref,
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
  async getLiveScoreboard(): Promise<Game[]> {
    const raw = await scoreboard(
      { limit: 100 },
      { cacheKey: 'liveScoreboard', cacheTtlMs: 60 * 1000 }
    );
    const year = new Date().getFullYear();
    return eventsToGames(raw, year);
  }

  async getCalendar(year: number): Promise<CalendarWeek[]> {
    const weeks: CalendarWeek[] = [];

    for (const seasonType of [REGULAR_SEASON_TYPE, POSTSEASON_SEASON_TYPE]) {
      const seasonTypeLabel = seasonType === POSTSEASON_SEASON_TYPE ? 'postseason' : 'regular';
      try {
        const seasonWeekList = await fetchSeasonWeekDetails(year, seasonType);
        for (const w of seasonWeekList) {
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
    const raw = await scoreboard(
      { dates: year, week, seasonType: seasontype, limit: 300 },
      { cacheKey: `weekSb:${year}:${seasontype}:${week}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    return eventsToGames(raw, year).map((g) => ({ ...g, week: g.week || week }));
  }
}
