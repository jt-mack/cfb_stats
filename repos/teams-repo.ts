import {
  espnGet,
  summary as fetchSummary,
  team as fetchTeam,
  seasonTeam as fetchSeasonTeam,
  teamNews as fetchTeamNews,
  teamRoster as fetchTeamRoster,
  teamSchedule as fetchTeamSchedule,
  TEAM_LEADERS_V3,
  TEAM_SEASON_COACHES_URL,
} from '../lib/espn';
import { getDefaultSeason } from '../lib/espn-client';
import { eventsToGames, mapPicksToOdds, summaryToPicks } from '../lib/game-mappers';
import { mapNewsRow } from './news-repo';
import { RatingsRepo } from './ratings-repo';
import {
  conferenceNameFromGroupId,
  mapEspnNextEvent,
  mapEspnTeamToTeam,
  mapRanksToRank,
  mapRecordItems,
  synthesizeStandingSummary,
  teamIndex,
} from '../lib/team-index';
import type { SdvParsedRosterRow, SdvSeasonCoachEntry, SdvTeamRecord } from '../lib/espn-types';
import type {
  BettingGame,
  Coach,
  Game,
  GameMedia,
  GameWeather,
  GameWithOdds,
  LeaderEntry,
  NewsArticle,
  PregameWinProbability,
  RosterPlayer,
  Team,
} from '../lib/types';
import { num, parseWlRecord } from '../utils/parse';

export type GameEnrichment = {
  gameId: number;
  odds: PregameWinProbability | null;
  media: GameMedia[];
  weather: GameWeather | null;
  lines: BettingGame | null;
};

const PREFERRED_LEADER_CATEGORIES = [
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

type TeamLeadersV3Payload = {
  requestedSeason?: { year?: number };
  leaders?: {
    categories?: Array<{
      name?: string;
      displayName?: string;
      leaders?: Array<{
        displayValue?: string;
        value?: number;
        athlete?: {
          id?: string | number;
          displayName?: string;
          fullName?: string;
          jersey?: string | number;
          position?: { abbreviation?: string };
        };
      }>;
    }>;
  };
};

function parseHeight(raw: unknown): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/(\d+)-(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
}

export function mapParsedRosterRows(rows: SdvParsedRosterRow[], school: string, year: number): RosterPlayer[] {
  return rows.map((a) => ({
    id: String(a.id ?? ''),
    firstName: a.first_name ?? '',
    lastName: a.last_name ?? '',
    team: school,
    height: parseHeight(a.display_height ?? a.height),
    weight: num(a.weight),
    jersey: num(a.jersey),
    year: a.experience_years ?? year,
    position: a.position_abbreviation ?? null,
  }));
}

export function mapSeasonCoachEntry(
  entry: SdvSeasonCoachEntry,
  school: string,
  year: number,
  teamRecord?: string
): Coach[] {
  if (!entry.firstName && !entry.lastName) return [];
  const record = parseWlRecord(teamRecord);
  return [
    {
      firstName: entry.firstName ?? '',
      lastName: entry.lastName ?? '',
      hireDate: '',
      seasons: [
        {
          school,
          year,
          games: record.games,
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
        },
      ],
    },
  ];
}

export class TeamsRepo {
  private ratingsRepo = new RatingsRepo();

  async getTeamInfo(teamIdOrSchool: string, year: number): Promise<Team | null> {
    const resolved = await teamIndex.resolveTeam(teamIdOrSchool, year);
    if (!resolved) return null;

    try {
      const seasonDoc = await fetchSeasonTeam(
        { teamId: resolved.id, season: year },
        { cacheKey: `seasonTeam:${year}:${resolved.id}`, cacheTtlMs: 60 * 60 * 1000 }
      );

      const recordRef = seasonDoc.record && '$ref' in seasonDoc.record ? seasonDoc.record.$ref : undefined;
      const ranksRef = seasonDoc.ranks?.$ref;
      const isActiveSeason = year === getDefaultSeason();

      const [recordResult, ranksResult, coachResult, hubResult] = await Promise.allSettled([
        recordRef
          ? espnGet<SdvTeamRecord>(recordRef, {
              cacheKey: `teamRecord:${recordRef}`,
              cacheTtlMs: 15 * 60 * 1000,
            })
          : Promise.resolve(seasonDoc.record as SdvTeamRecord | undefined),
        ranksRef
          ? espnGet<unknown>(ranksRef, {
              cacheKey: `teamRanks:${ranksRef}`,
              cacheTtlMs: 15 * 60 * 1000,
            })
          : Promise.resolve(null),
        this.resolveCoachName(resolved.id, year, seasonDoc.coaches?.$ref),
        isActiveSeason
          ? fetchTeam(resolved.id, {
              cacheKey: `teamHub:${resolved.id}`,
              cacheTtlMs: 15 * 60 * 1000,
            })
          : Promise.resolve(null),
      ]);

      const recordPayload = recordResult.status === 'fulfilled' ? recordResult.value : undefined;
      const ranksPayload = ranksResult.status === 'fulfilled' ? ranksResult.value : null;
      const coach = coachResult.status === 'fulfilled' ? coachResult.value : null;
      const hubTeam = hubResult.status === 'fulfilled' ? hubResult.value?.team : undefined;

      const team = mapEspnTeamToTeam(seasonDoc, resolved.conference);
      const fromGroup = conferenceNameFromGroupId(team.conferenceGroupId);
      if (fromGroup) team.conference = fromGroup;

      const mappedRecord = mapRecordItems(recordPayload?.items);
      if (mappedRecord.recordSummary) team.recordSummary = mappedRecord.recordSummary;
      team.recordStats = mappedRecord.recordStats;

      const rankFromCore = mapRanksToRank(ranksPayload);
      const hubRank = hubTeam?.rank != null && hubTeam.rank > 0 ? hubTeam.rank : null;
      team.rank = rankFromCore ?? hubRank ?? team.rank ?? null;

      team.standingSummary =
        hubTeam?.standingSummary ??
        synthesizeStandingSummary(team.rank, team.conference);

      if (hubTeam?.nextEvent) {
        team.nextEvent = mapEspnNextEvent(hubTeam.nextEvent);
      }

      if (coach) team.coach = coach;

      return team;
    } catch (err) {
      console.warn(`getTeamInfo upstream failed for ${teamIdOrSchool}:`, err instanceof Error ? err.message : err);
    }
    return resolved;
  }

  private async resolveCoachName(
    teamId: number,
    year: number,
    coachesRef?: string
  ): Promise<{ firstName: string; lastName: string } | null> {
    const listUrl = coachesRef ?? TEAM_SEASON_COACHES_URL(year, teamId);
    try {
      const list = await espnGet<{ items?: Array<{ '$ref'?: string }> }>(listUrl, {
        cacheKey: `teamSeasonCoaches:${year}:${teamId}`,
        cacheTtlMs: 24 * 60 * 60 * 1000,
        timeoutMs: 8_000,
      });
      const ref = list.items?.[0]?.['$ref'];
      if (!ref) return null;
      const entry = await espnGet<SdvSeasonCoachEntry>(ref, {
        cacheKey: `seasonCoach:${ref}`,
        cacheTtlMs: 24 * 60 * 60 * 1000,
        timeoutMs: 8_000,
      });
      if (!entry.firstName && !entry.lastName) return null;
      return { firstName: entry.firstName ?? '', lastName: entry.lastName ?? '' };
    } catch {
      return null;
    }
  }

  async getRoster(team: string, year: number): Promise<RosterPlayer[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    if (!teamId) return [];

    const rows = await fetchTeamRoster(teamId, {
      cacheKey: `teamRoster:${teamId}`,
      cacheTtlMs: 60 * 60 * 1000,
    });
    return mapParsedRosterRows(rows, school, year);
  }

  async getCoaches(team: string, year: number): Promise<Coach[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    if (!teamId) return [];

    try {
      const seasonDoc = await fetchSeasonTeam(
        { teamId, season: year },
        { cacheKey: `seasonTeam:${year}:${teamId}`, cacheTtlMs: 60 * 60 * 1000 }
      );
      const coach = await this.resolveCoachName(teamId, year, seasonDoc.coaches?.$ref);
      if (!coach) return [];

      const recordRef = seasonDoc.record && '$ref' in seasonDoc.record ? seasonDoc.record.$ref : undefined;
      let recordSummary: string | undefined;
      if (recordRef) {
        const recordPayload = await espnGet<SdvTeamRecord>(recordRef, {
          cacheKey: `teamRecord:${recordRef}`,
          cacheTtlMs: 15 * 60 * 1000,
        });
        recordSummary = mapRecordItems(recordPayload.items).recordSummary ?? undefined;
      }

      return mapSeasonCoachEntry(
        { firstName: coach.firstName, lastName: coach.lastName },
        school,
        year,
        recordSummary
      );
    } catch (err) {
      console.warn(`getCoaches failed for ${team}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getSchedule(team: string, year: number): Promise<Game[]> {
    const meta = await teamIndex.resolveTeamMeta(team, year);
    if (!meta) return [];

    const raw = await fetchTeamSchedule(
      { teamId: meta.id, season: year },
      { cacheKey: `schedule:${meta.id}:${year}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    return eventsToGames(raw, year);
  }

  async getScheduleWithOdds(team: string, year: number): Promise<GameWithOdds[]> {
    const games = await this.getSchedule(team, year);
    return games.map((g) => ({ ...g, odds: undefined }));
  }

  async getScheduleEnrichment(team: string, year: number): Promise<GameEnrichment[]> {
    const games = await this.getSchedule(team, year);
    if (!games.length) return [];

    const upcoming = games.filter((g) => !g.completed).slice(0, 6);
    const upcomingResults = await Promise.all(
      upcoming.map(async (game) => {
        try {
          const raw = await fetchSummary(game.id, {
            cacheKey: `gameSummaryRaw:${game.id}`,
            cacheTtlMs: 60 * 60 * 1000,
          });
          const { odds, lines, media, weather } = mapPicksToOdds(summaryToPicks(raw, game.id), game);
          return { gameId: game.id, odds, media, weather, lines } satisfies GameEnrichment;
        } catch {
          return {
            gameId: game.id,
            odds: null,
            media: [],
            weather: null,
            lines: null,
          } satisfies GameEnrichment;
        }
      })
    );

    const completedResults = games
      .filter((g) => g.completed)
      .map(
        (game) =>
          ({
            gameId: game.id,
            odds: null,
            media: [],
            weather: null,
            lines: null,
          }) satisfies GameEnrichment
      );

    return [...upcomingResults, ...completedResults];
  }

  async getTeamNews(teamIdOrSchool: string, year: number, limit = 15): Promise<NewsArticle[]> {
    const teamId = await teamIndex.resolveTeamId(teamIdOrSchool, year);
    if (!teamId) return [];
    const rows = await fetchTeamNews(teamId, limit, {
      cacheKey: `teamNews:${teamId}:${limit}`,
      cacheTtlMs: 10 * 60 * 1000,
    });
    return (Array.isArray(rows) ? rows : []).map(mapNewsRow).filter((a) => a.id && a.headline);
  }

  async getTeamLeaders(teamIdOrSchool: string, year: number): Promise<LeaderEntry[]> {
    const teamId = await teamIndex.resolveTeamId(teamIdOrSchool, year);
    if (!teamId) return [];

    let payload: TeamLeadersV3Payload;
    try {
      payload = await espnGet<TeamLeadersV3Payload>(TEAM_LEADERS_V3(teamId, year), {
        cacheKey: `teamLeadersV3:${year}:${teamId}`,
        cacheTtlMs: 30 * 60 * 1000,
        timeoutMs: 10_000,
      });
    } catch (err) {
      console.warn('Team leaders unavailable:', err instanceof Error ? err.message : err);
      return [];
    }

    const effectiveSeason = payload.requestedSeason?.year ?? year;
    const categories = payload.leaders?.categories ?? [];
    const byName = new Map(categories.map((c) => [c.name, c]));
    const school = (await teamIndex.resolveSchoolName(String(teamId), effectiveSeason)) ?? `Team ${teamId}`;

    const out: LeaderEntry[] = [];
    for (const catName of PREFERRED_LEADER_CATEGORIES) {
      const cat = byName.get(catName);
      const top = cat?.leaders?.[0];
      const athlete = top?.athlete;
      if (!cat || !top || !athlete?.id) continue;
      out.push({
        rank: 1,
        playerId: String(athlete.id),
        player: athlete.displayName ?? athlete.fullName ?? `Athlete ${athlete.id}`,
        teamId,
        team: school,
        position: athlete.position?.abbreviation ?? null,
        jersey: athlete.jersey != null ? Number(athlete.jersey) : null,
        category: catName,
        categoryDisplay: cat.displayName ?? catName,
        value: Number(top.value ?? 0),
        displayValue: String(top.displayValue ?? top.value ?? ''),
        season: effectiveSeason,
      });
    }
    return out;
  }

  async getTeamRatings(year: number, team: string) {
    const [fpi, efficiency, ats] = await Promise.all([
      this.ratingsRepo.getFpiRatings(year),
      this.ratingsRepo.getEfficiencyRatings(year),
      this.getTeamAts(year, team),
    ]);

    return {
      fpi: fpi.find((r) => r.team === team) ?? null,
      efficiency: efficiency.find((r) => r.team === team) ?? null,
      ats: ats[0] ?? null,
    };
  }

  async getRecruiting(team: string, year: number) {
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    const [recruiting, talent] = await Promise.all([
      this.ratingsRepo.getRecruitingRankings(year),
      this.ratingsRepo.getTalent(year),
    ]);
    return {
      recruiting: recruiting.filter((r) => r.team === school),
      talent: talent.find((t) => t.team === school) ?? null,
    };
  }

  private async getTeamAts(year: number, team: string) {
    const meta = await teamIndex.resolveTeamMeta(team, year);
    if (!meta) return [];

    try {
      const schedule = await fetchTeamSchedule(
        { teamId: meta.id, season: year },
        { cacheKey: `schedule:${meta.id}:${year}`, cacheTtlMs: 15 * 60 * 1000 }
      );
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
        const isHome = homeName.toLowerCase() === meta.school.toLowerCase();
        const isAway = awayName.toLowerCase() === meta.school.toLowerCase();
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
}
