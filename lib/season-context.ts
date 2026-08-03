import { ScoreboardRepo } from '../repos/scoreboard-repo';
import { FbsRepo } from '../repos/fbs-repo';
import { getDefaultSeason } from './sdv';
import type { CalendarWeek } from './types';

export type SeasonPhase = 'offseason' | 'preseason' | 'regular' | 'postseason';

export type SeasonContext = {
  year: number;
  defaultSeason: number;
  phase: SeasonPhase;
  currentWeek: number | null;
  seasonStarted: boolean;
  firstGameDate: string | null;
  hasPublishedRankings: boolean;
  rankingsWeek: number | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function findActiveWeek(weeks: CalendarWeek[], now: Date): CalendarWeek | null {
  return (
    weeks.find((w) => {
      const start = parseDate(w.startDate);
      const end = parseDate(w.endDate);
      if (!start || !end) return false;
      return now >= start && now <= end;
    }) ?? null
  );
}

export async function buildSeasonContext(year: number): Promise<SeasonContext> {
  const now = new Date();
  const defaultSeason = getDefaultSeason();
  const scoreboardRepo = new ScoreboardRepo();
  const fbsRepo = new FbsRepo();

  let phase: SeasonPhase = 'offseason';
  let currentWeek: number | null = null;
  let seasonStarted = false;
  let firstGameDate: string | null = null;
  let hasPublishedRankings = false;
  let rankingsWeek: number | null = null;

  let calendar: CalendarWeek[] = [];
  try {
    calendar = await scoreboardRepo.getCalendar(year);
    const regularWeeks = calendar.filter((w) => w.seasonType === 'regular');
    const postseasonWeeks = calendar.filter((w) => w.seasonType === 'postseason');
    const allWeeks = [...regularWeeks, ...postseasonWeeks];

    const firstRegular = regularWeeks.length
      ? regularWeeks.reduce((a, b) => {
          const da = parseDate(a.startDate);
          const db = parseDate(b.startDate);
          if (!da) return b;
          if (!db) return a;
          return da < db ? a : b;
        })
      : null;

    firstGameDate = firstRegular?.startDate ?? null;
    const firstDate = parseDate(firstGameDate);

    if (firstDate && now < firstDate) {
      phase = 'preseason';
    } else if (firstDate && now >= firstDate) {
      seasonStarted = true;
      const activeRegular = findActiveWeek(regularWeeks, now);
      const activePostseason = findActiveWeek(postseasonWeeks, now);

      if (activePostseason) {
        phase = 'postseason';
        currentWeek = activePostseason.week;
      } else if (activeRegular) {
        phase = 'regular';
        currentWeek = activeRegular.week;
      } else {
        const lastRegular = regularWeeks.reduce((a, b) => (b.week > a.week ? b : a), regularWeeks[0]);
        const lastRegularEnd = parseDate(lastRegular?.endDate);
        const firstPostseason = postseasonWeeks.length
          ? postseasonWeeks.reduce((a, b) => {
              const da = parseDate(a.startDate);
              const db = parseDate(b.startDate);
              if (!da) return b;
              if (!db) return a;
              return da < db ? a : b;
            })
          : null;
        const firstPostseasonStart = parseDate(firstPostseason?.startDate);
        const lastPostseason = postseasonWeeks.reduce((a, b) => (b.week > a.week ? b : a), postseasonWeeks[0]);
        const lastPostseasonEnd = parseDate(lastPostseason?.endDate);

        if (lastRegularEnd && now > lastRegularEnd) {
          if (firstPostseasonStart && now >= firstPostseasonStart) {
            phase = lastPostseasonEnd && now > lastPostseasonEnd ? 'offseason' : 'postseason';
            currentWeek = lastPostseason?.week ?? null;
          } else {
            phase = 'postseason';
            currentWeek = lastRegular?.week ?? null;
          }
        } else {
          phase = 'regular';
          currentWeek = lastRegular?.week ?? null;
        }
      }
    } else if (year >= defaultSeason) {
      phase = 'preseason';
    }
  } catch (err) {
    console.warn(`buildSeasonContext calendar failed for ${year}:`, err instanceof Error ? err.message : err);
    if (year >= defaultSeason) phase = 'preseason';
    else phase = 'offseason';
  }

  // Historical seasons are complete relative to "now" — never present as live.
  if (year < defaultSeason && (phase === 'regular' || phase === 'postseason')) {
    phase = 'offseason';
  }

  try {
    const rankMap = await fbsRepo.getRankingsFromPolls(year);
    if (rankMap.size > 0) {
      hasPublishedRankings = true;
      rankingsWeek = currentWeek ?? 1;
    }
  } catch (err) {
    console.warn(`buildSeasonContext rankings failed for ${year}:`, err instanceof Error ? err.message : err);
  }

  if (!seasonStarted && phase !== 'preseason') {
    try {
      const sample = await scoreboardRepo.getWeekGames(year, 1);
      if (sample.some((g) => g.completed)) {
        seasonStarted = true;
        // Do not resurrect historical seasons as "regular" — that drives live UI.
        if (phase === 'offseason' && year >= defaultSeason) {
          phase = 'regular';
        }
        currentWeek = currentWeek ?? 1;
      }
    } catch {
      // ignore
    }
  }

  return {
    year,
    defaultSeason,
    phase,
    currentWeek,
    seasonStarted,
    firstGameDate,
    hasPublishedRankings,
    rankingsWeek,
  };
}
