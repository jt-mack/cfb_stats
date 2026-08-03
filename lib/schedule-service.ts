import {
  FBS_GROUP,
  POSTSEASON_SEASON_TYPE,
  REGULAR_SEASON_TYPE,
  fetchParsedScoreboard,
  fetchParsedTeamSchedule,
  fetchTeamScheduleRaw,
  mapParsedScoreboardRow,
  mapParsedTeamScheduleRow,
  mapScheduleEvent,
  type SdvParsedScoreboardRow,
} from './sdv';
import { teamIndex } from './team-index';
import type { Game } from './types';

const REGULAR_WEEKS = 15;
const POSTSEASON_WEEKS = 4;

function teamInRow(row: SdvParsedScoreboardRow, teamId: number, school: string): boolean {
  const homeId = Number(row.home_id);
  const awayId = Number(row.away_id);
  if (homeId === teamId || awayId === teamId) return true;
  const schoolLower = school.toLowerCase();
  return (
    row.home_location?.toLowerCase() === schoolLower ||
    row.away_location?.toLowerCase() === schoolLower
  );
}

export async function buildTeamScheduleFromScoreboard(
  teamId: number,
  school: string,
  year: number
): Promise<Game[]> {
  const games: Game[] = [];
  const seen = new Set<number>();

  const weekPlans: { week: number; seasontype: number }[] = [
    ...Array.from({ length: REGULAR_WEEKS }, (_, i) => ({ week: i + 1, seasontype: REGULAR_SEASON_TYPE })),
    ...Array.from({ length: POSTSEASON_WEEKS }, (_, i) => ({ week: i + 1, seasontype: POSTSEASON_SEASON_TYPE })),
  ];

  for (const { week, seasontype } of weekPlans) {
    try {
      const rows = await fetchParsedScoreboard(
        { season: year, week, seasontype, groups: FBS_GROUP, limit: 300 },
        { cacheKey: `weekSb:${year}:${seasontype}:${week}`, cacheTtlMs: 15 * 60 * 1000 }
      );

      for (const row of rows) {
        if (!teamInRow(row, teamId, school)) continue;
        const gameId = Number(row.game_id);
        if (!gameId || seen.has(gameId)) continue;
        seen.add(gameId);
        games.push(mapParsedScoreboardRow(row, week));
      }
    } catch {
      // week not published yet
    }
  }

  return games.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getTeamSchedule(team: string, year: number): Promise<Game[]> {
  const teamId = await teamIndex.resolveTeamId(team, year);
  const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
  if (!teamId) return [];

  try {
    const parsed = await fetchParsedTeamSchedule(
      { teamId, season: year },
      { cacheKey: `scheduleParsed:${team}:${year}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    if (parsed.length > 0) {
      return parsed.map(mapParsedTeamScheduleRow);
    }

    const raw = await fetchTeamScheduleRaw(
      { teamId, season: year },
      { cacheKey: `scheduleRaw:${team}:${year}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    const events = raw.events ?? [];
    if (events.length > 0) {
      return events.map((e) => mapScheduleEvent(e, year));
    }
  } catch {
    // fall through to scoreboard builder
  }

  return buildTeamScheduleFromScoreboard(teamId, school, year);
}
