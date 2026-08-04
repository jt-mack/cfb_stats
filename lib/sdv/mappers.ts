/**
 * Maps sportsdataverse / ESPN shapes to CFBD-compatible API types (`lib/types.ts`).
 */
import type {
  AdvancedBoxScoreData,
  AdvancedSeasonStat,
  BettingGame,
  Conference,
  Game,
  GameDetail,
  GameMedia,
  GamePlayerStatEntry,
  GameTeamStatEntry,
  GameWeather,
  Matchup,
  PlayerStat,
  PregameWinProbability,
  RosterPlayer,
  Team,
  TeamRecords,
  Coach,
} from '../types';
import type {
  SdvCfbPicks,
  SdvCfbSummary,
  SdvEspnTeam,
  SdvParsedPowerIndexRow,
  SdvParsedRosterRow,
  SdvParsedScoreboardRow,
  SdvParsedStandingsRow,
  SdvParsedTeamScheduleRow,
  SdvPredictiveMetric,
  SdvSeasonCoachEntry,
  SdvStandingsEntry,
  SdvStandingsResponse,
  SdvTeamInfoResponse,
  SdvTeamResponse,
} from './types';
import { FBS_CONFERENCES, FBS_CONFERENCE_BY_ABBR } from './constants';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** ESPN CDN logo URL from team id — used when parsed standings omit team_logo. */
export function espnTeamLogoUrl(teamId: number | string): string {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`;
}

export function resolveTeamLogos(
  teamId: number | string | undefined,
  logos?: { href?: string }[] | null,
  teamLogo?: string | null
): string[] | null {
  const hrefs = logos?.map((l) => l.href).filter(Boolean) as string[] | undefined;
  if (hrefs?.length) return hrefs;
  if (teamLogo) return [teamLogo];
  if (teamId != null && teamId !== '') return [espnTeamLogoUrl(teamId)];
  return null;
}

function parseRecord(displayValue: string | undefined): { wins: number; losses: number; ties: number; games: number } {
  if (!displayValue) return { wins: 0, losses: 0, ties: 0, games: 0 };
  const parts = displayValue.split('-').map((p) => parseInt(p, 10));
  const wins = parts[0] ?? 0;
  const losses = parts[1] ?? 0;
  const ties = parts[2] ?? 0;
  return { wins, losses, ties, games: wins + losses + ties };
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function parseHeight(raw: unknown): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/(\d+)-(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
}

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

export function mapEspnTeamToTeam(espn: SdvEspnTeam, conference?: string | null): Team {
  const id = num(espn.id) ?? 0;
  const school = espn.location ?? espn.nickname ?? espn.displayName ?? 'Unknown';
  const venue = (espn as { venue?: Record<string, unknown> }).venue;
  const address = venue?.address as { city?: string; state?: string } | undefined;
  const location = venue
    ? {
        name: String(venue.fullName ?? venue.displayName ?? ''),
        city: String(address?.city ?? (venue as { city?: string }).city ?? ''),
        state: String(address?.state ?? (venue as { state?: string }).state ?? ''),
        capacity: num(venue.capacity),
        constructionYear: num(venue.constructionYear ?? venue.construction_year),
        grass: Boolean(venue.grass),
        dome: Boolean(venue.indoor ?? venue.dome),
      }
    : null;

  const links = ((espn.links ?? []) as { href?: string; text?: string; rel?: string[] }[])
    .filter((l) => l.href)
    .map((l) => ({ href: l.href!, text: l.text ?? l.rel?.[0] ?? 'Link' }));

  return {
    id,
    school,
    mascot: espn.name ?? null,
    abbreviation: espn.abbreviation ?? null,
    conference: conference ?? espn.groups?.[0]?.shortName ?? espn.groups?.[0]?.name ?? null,
    division: null,
    classification: 'fbs',
    color: espn.color ? `#${espn.color.replace('#', '')}` : null,
    alternateColor: espn.alternateColor ? `#${espn.alternateColor.replace('#', '')}` : null,
    logos: resolveTeamLogos(id, espn.logos),
    twitter: (espn as { twitter?: string }).twitter ?? null,
    location,
    links: links.length ? links : null,
  };
}

export function mapParsedScoreboardRow(row: SdvParsedScoreboardRow, week = 0): Game {
  const homeScore = num(row.home_score);
  const awayScore = num(row.away_score);
  const completed = Boolean(row.status_type_completed) || row.status_type_state === 'post';
  return {
    id: num(row.game_id) ?? 0,
    season: row.season_year ?? new Date().getFullYear(),
    week,
    startDate: row.date ?? '',
    completed,
    neutralSite: Boolean(row.neutral_site),
    conferenceGame: Boolean(row.conference_competition),
    venue: row.venue_full_name ?? null,
    homeTeam: row.home_location ?? row.home_display_name ?? '',
    awayTeam: row.away_location ?? row.away_display_name ?? '',
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: null,
    awayLineScores: null,
    status: row.status_type_description,
  };
}

export function mapParsedTeamScheduleRow(row: SdvParsedTeamScheduleRow): Game {
  let comp: Record<string, unknown> | undefined;
  try {
    const competitions = JSON.parse(row.competitions ?? '[]') as Record<string, unknown>[];
    comp = competitions[0];
  } catch {
    comp = undefined;
  }

  const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeTeam = home?.team as string | SdvEspnTeam | undefined;
  const awayTeam = away?.team as string | SdvEspnTeam | undefined;
  const homeScore = num((home?.score as { value?: unknown })?.value ?? home?.score);
  const awayScore = num((away?.score as { value?: unknown })?.value ?? away?.score);
  const status = comp?.status as { type?: { completed?: boolean; description?: string; state?: string } } | undefined;
  const completed =
    Boolean(status?.type?.completed) || status?.type?.state === 'post';

  const homeName =
    typeof homeTeam === 'string' ? homeTeam : homeTeam?.location ?? homeTeam?.displayName ?? '';
  const awayName =
    typeof awayTeam === 'string' ? awayTeam : awayTeam?.location ?? awayTeam?.displayName ?? '';

  return {
    id: num(row.id) ?? 0,
    season: row.season_year ?? new Date().getFullYear(),
    week: row.week_number ?? 0,
    startDate: row.date ?? String(comp?.date ?? ''),
    completed,
    neutralSite: Boolean(comp?.neutralSite),
    conferenceGame: Boolean(comp?.conferenceCompetition),
    venue: (comp?.venue as { fullName?: string })?.fullName ?? null,
    homeTeam: homeName,
    awayTeam: awayName,
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: (home?.linescores as { value?: number }[] | undefined)?.map((l) => l.value ?? 0) ?? null,
    awayLineScores: (away?.linescores as { value?: number }[] | undefined)?.map((l) => l.value ?? 0) ?? null,
    status: status?.type?.description,
  };
}

export function mapScheduleEvent(event: Record<string, unknown>, season: number): Game {
  const comp = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
  const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeTeam = home?.team as SdvEspnTeam | undefined;
  const awayTeam = away?.team as SdvEspnTeam | undefined;
  const homeScore = num((home?.score as { value?: unknown })?.value ?? home?.score);
  const awayScore = num((away?.score as { value?: unknown })?.value ?? away?.score);
  const status = comp?.status as { type?: { completed?: boolean; description?: string } } | undefined;
  const weekObj = event.week as { number?: number } | undefined;

  return {
    id: num(event.id) ?? 0,
    season,
    week: weekObj?.number ?? num(comp?.week) ?? 0,
    startDate: String(event.date ?? comp?.date ?? ''),
    completed: Boolean(status?.type?.completed),
    neutralSite: Boolean(comp?.neutralSite),
    conferenceGame: Boolean(comp?.conferenceCompetition),
    venue: (comp?.venue as { fullName?: string })?.fullName ?? null,
    homeTeam: homeTeam?.location ?? homeTeam?.displayName ?? '',
    awayTeam: awayTeam?.location ?? awayTeam?.displayName ?? '',
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: (home?.linescores as { value?: number }[] | undefined)?.map((l) => l.value ?? 0) ?? null,
    awayLineScores: (away?.linescores as { value?: number }[] | undefined)?.map((l) => l.value ?? 0) ?? null,
    status: status?.type?.description,
  };
}

export function listFbsConferences(): Conference[] {
  return FBS_CONFERENCES.filter((c) => c.id !== 80 && c.id < 80).map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    abbreviation: c.abbreviation,
    classification: 'fbs',
  }));
}

export function resolveConferenceMeta(conferenceAbbr: string) {
  const lower = conferenceAbbr.toLowerCase();
  return (
    FBS_CONFERENCE_BY_ABBR.get(lower) ??
    listFbsConferences().find(
      (c) =>
        c.abbreviation?.toLowerCase() === lower ||
        c.shortName?.toLowerCase() === lower ||
        c.name.toLowerCase() === lower ||
        String(c.id) === conferenceAbbr
    ) ??
    null
  );
}

export function mapParsedStandingsToTeam(row: SdvParsedStandingsRow, conference: string): Team {
  return mapEspnTeamToTeam(
    {
      id: row.team_id,
      location: row.team_location,
      name: row.team_name,
      displayName: row.team_display_name,
      abbreviation: row.team_abbreviation,
      logos: resolveTeamLogos(row.team_id, undefined, row.team_logo)?.map((href) => ({ href })),
    },
    conference
  );
}

export function mapParsedStandingsToRecord(
  row: SdvParsedStandingsRow,
  year: number,
  conference: string
): TeamRecords {
  // SDV's parsed standings store `stat.value`, but overall / vs. Conf. records only
  // have `displayValue` (e.g. "11-3"). Prefer string W-L fields; never invent losses
  // from a bare wins count (that mislabels conference wins as overall).
  const overall =
    typeof row.overall === 'string' && row.overall.includes('-')
      ? row.overall
      : undefined;
  const vsConf =
    typeof row.vs_conf === 'string' && row.vs_conf.includes('-')
      ? row.vs_conf
      : undefined;

  return {
    year,
    teamId: num(row.team_id) ?? 0,
    team: row.team_location ?? row.team_display_name ?? '',
    conference,
    total: parseRecord(overall),
    conferenceGames: parseRecord(vsConf),
  };
}

/** Flatten ESPN standings entries from a possibly nested children payload. */
export function extractStandingsEntries(raw: SdvStandingsResponse | null | undefined): SdvStandingsEntry[] {
  if (!raw) return [];
  const entries: SdvStandingsEntry[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as SdvStandingsResponse & { children?: unknown[] };
    const list = n.standings?.entries;
    if (Array.isArray(list)) entries.push(...list);
    for (const child of n.children ?? []) walk(child);
  };

  if (Array.isArray(raw.children) && raw.children.length) {
    for (const child of raw.children) walk(child);
  } else {
    walk(raw);
  }

  return entries;
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

function parseCoachRecord(teamRecord?: string): { games: number; wins: number; losses: number; ties: number } {
  const parts = (teamRecord ?? '').split('-').map((p) => parseInt(p, 10));
  const wins = Number.isFinite(parts[0]) ? parts[0] : 0;
  const losses = Number.isFinite(parts[1]) ? parts[1] : 0;
  const ties = Number.isFinite(parts[2]) ? parts[2] : 0;
  return { wins, losses, ties, games: wins + losses + ties };
}

export function mapSeasonCoachEntry(
  entry: SdvSeasonCoachEntry,
  school: string,
  year: number,
  teamRecord?: string
): Coach[] {
  if (!entry.firstName && !entry.lastName) return [];
  const record = parseCoachRecord(teamRecord);
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

/** @deprecated Use listFbsConferences */
export function mapEspnConferences(_raw: unknown): Conference[] {
  return listFbsConferences();
}

export function mapStandingsEntryToRecord(
  entry: SdvStandingsEntry,
  year: number,
  conference: string
): TeamRecords {
  const team = entry.team as SdvEspnTeam;
  const stats = entry.stats ?? [];
  const overall = stats.find((s) => s.type === 'total');
  const conf = stats.find((s) => s.type === 'vsconf');
  return {
    year,
    teamId: num(team?.id) ?? 0,
    team: team?.location ?? team?.displayName ?? '',
    conference,
    total: parseRecord(overall?.displayValue),
    conferenceGames: parseRecord(conf?.displayValue),
  };
}

export function mapStandingsEntryToTeam(entry: SdvStandingsEntry, conference: string): Team {
  return mapEspnTeamToTeam(entry.team as SdvEspnTeam, conference);
}

export function mapRosterFromTeamPlayers(
  raw: SdvParsedRosterRow[] | SdvTeamInfoResponse,
  school: string,
  year: number
): RosterPlayer[] {
  if (Array.isArray(raw)) return mapParsedRosterRows(raw, school, year);
  const athletes = raw.team?.athletes ?? [];
  return athletes.map((a) => {
    const { firstName, lastName } = splitDisplayName(String(a.displayName ?? ''));
    return {
      id: String(a.id ?? ''),
      firstName,
      lastName,
      team: school,
      height: parseHeight(a.displayHeight ?? a.height),
      weight: num(a.weight),
      jersey: num(a.jersey),
      year,
      position: a.position?.abbreviation ?? null,
    };
  });
}

export function mapSummaryToGameDetail(summary: SdvCfbSummary): GameDetail {
  const header = summary.header as Record<string, unknown> | undefined;
  const competitions = (header?.competitions as Record<string, unknown>[] | undefined) ?? [];
  const comp = competitions[0];
  const gameId = num(summary.id ?? header?.id) ?? 0;
  const season = (summary.season as { year?: number })?.year ?? 0;
  const week = (summary.week as { number?: number })?.number ?? 0;

  const game = mapScheduleEvent(
    { id: gameId, date: comp?.date, week: { number: week }, competitions: [comp] },
    season
  );

  const boxScore = summary.boxScore as Record<string, unknown> | undefined;
  const teamStats: GameTeamStatEntry[] = [];
  const playerStats: GamePlayerStatEntry[] = [];

  if (boxScore?.teams) {
    const teams = boxScore.teams as Record<string, unknown>[];
    teamStats.push({
      id: gameId,
      teams: teams.map((t) => {
        const teamInfo = t.team as SdvEspnTeam;
        const stats = (t.statistics as { name?: string; displayValue?: string; label?: string }[] | undefined) ?? [];
        return {
          teamId: num(teamInfo.id) ?? 0,
          team: teamInfo.location ?? teamInfo.displayName ?? '',
          homeAway: String(t.homeAway ?? ''),
          points: num((t as { score?: unknown }).score),
          stats: stats.map((s) => ({ category: s.name ?? s.label ?? '', stat: s.displayValue ?? '' })),
        };
      }),
    });
  }

  const playerBox = boxScore?.players as Record<string, unknown>[] | undefined;
  if (playerBox?.length) {
    playerStats.push({
      id: gameId,
      teams: playerBox.map((group) => {
        const teamInfo = group.team as SdvEspnTeam;
        const statistics = (group.statistics as Record<string, unknown>[] | undefined) ?? [];
        const categories = statistics.map((cat) => {
          const types = (cat.types as Record<string, unknown>[] | undefined) ?? [];
          return {
            name: String(cat.name ?? cat.text ?? ''),
            types: types.map((type) => {
              const athletes = (type.athletes as Record<string, unknown>[] | undefined) ?? [];
              return {
                name: String(type.name ?? type.text ?? ''),
                athletes: athletes.map((a) => {
                  const athlete = a.athlete as { id?: string; displayName?: string; fullName?: string };
                  const stats = (a.stats as string[] | undefined) ?? [];
                  return {
                    id: String(athlete?.id ?? ''),
                    name: athlete?.displayName ?? athlete?.fullName ?? '',
                    stat: stats.join(' '),
                  };
                }),
              };
            }),
          };
        });
        return {
          team: teamInfo?.location ?? teamInfo?.displayName ?? '',
          categories,
        };
      }),
    });
  }

  const gameInfo = summary.gameInfo as Record<string, unknown> | undefined;
  const advancedBoxScore: AdvancedBoxScoreData = {
    gameInfo: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: gameInfo?.venue as { fullName?: string } | undefined,
    },
    teams: boxScore?.teams as Record<string, unknown> | undefined,
  };

  return { game, teamStats, playerStats, advancedBoxScore };
}

export function mapPicksToOdds(picks: SdvCfbPicks, game: Game): {
  odds: PregameWinProbability | null;
  lines: BettingGame | null;
  media: GameMedia[];
  weather: GameWeather | null;
} {
  const oddsRaw = (picks.odds as Record<string, unknown>[] | undefined) ?? [];
  const pickcenter = (picks.pickcenter as Record<string, unknown>[] | undefined) ?? oddsRaw;
  const firstOdds = pickcenter[0] ?? oddsRaw[0];

  let spread = 0;
  let homeWinProbability = 0.5;
  if (firstOdds) {
    spread = num(firstOdds.spread) ?? 0;
    const homeOdds = firstOdds.homeTeamOdds as { winPercentage?: number } | undefined;
    if (homeOdds?.winPercentage != null) {
      homeWinProbability = homeOdds.winPercentage;
    }
  }

  const winProbArr = (picks.winProbability as { homeWinPercentage?: number }[] | undefined) ?? [];
  if (homeWinProbability === 0.5 && winProbArr[0]?.homeWinPercentage != null) {
    homeWinProbability = winProbArr[0].homeWinPercentage;
  }

  const odds: PregameWinProbability | null = firstOdds
    ? { gameId: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, spread, homeWinProbability }
    : null;

  const lines: BettingGame | null = firstOdds
    ? {
        id: game.id,
        lines: [{ spread, overUnder: num(firstOdds.overUnder) ?? 0, provider: 'ESPN' }],
      }
    : null;

  const broadcasts =
    (picks.gameInfo as { broadcasts?: { names?: string[]; type?: { shortName?: string } }[] })?.broadcasts ?? [];
  const media: GameMedia[] = broadcasts.flatMap((b) =>
    (b.names ?? []).map((name) => ({
      outlet: name,
      mediaType: b.type?.shortName ?? 'TV',
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
    }))
  );

  const weatherInfo = (picks.gameInfo as { weather?: Record<string, unknown> })?.weather;
  const weather: GameWeather | null = weatherInfo
    ? {
        gameIndoors: Boolean(weatherInfo.indoor),
        temperature: num(weatherInfo.temperature),
        humidity: num(weatherInfo.humidity),
        windSpeed: num(weatherInfo.windSpeed),
        windDirection: num(weatherInfo.windDirection),
        precipitation: num(weatherInfo.precipitation),
        snowfall: num(weatherInfo.snowfall),
        condition: { description: String(weatherInfo.displayValue ?? '') },
      }
    : null;

  return { odds, lines, media, weather };
}

export function mapLeadersToPlayerStats(leaders: Record<string, unknown>[], season: number): PlayerStat[] {
  const results: PlayerStat[] = [];
  for (const group of leaders) {
    const category = String(group.name ?? group.displayName ?? '');
    const leaderList = (group.leaders as Record<string, unknown>[] | undefined) ?? [];
    for (const leader of leaderList) {
      const athlete = leader.athlete as { id?: string; displayName?: string; position?: { abbreviation?: string } };
      const team = leader.team as SdvEspnTeam;
      results.push({
        playerId: String(athlete?.id ?? ''),
        player: athlete?.displayName ?? '',
        team: team?.location ?? team?.displayName ?? '',
        position: athlete?.position?.abbreviation ?? '',
        category,
        statType: category,
        stat: String(leader.displayValue ?? leader.value ?? ''),
        season,
      });
    }
  }
  return results;
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

export function buildMatchupFromSchedules(team1: string, team2: string, schedule1: Game[], schedule2: Game[]): Matchup {
  const allGames = [...schedule1, ...schedule2];
  const h2h = allGames.filter(
    (g) =>
      (g.homeTeam === team1 && g.awayTeam === team2) || (g.homeTeam === team2 && g.awayTeam === team1)
  );
  const seen = new Set<number>();
  const unique = h2h.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return g.completed;
  });

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  const games = unique.map((g) => {
    const homeScore = g.homePoints;
    const awayScore = g.awayPoints;
    if (homeScore != null && awayScore != null) {
      const team1Home = g.homeTeam === team1;
      const team1Score = team1Home ? homeScore : awayScore;
      const team2Score = team1Home ? awayScore : homeScore;
      if (team1Score > team2Score) team1Wins++;
      else if (team2Score > team1Score) team2Wins++;
      else ties++;
    }
    return { season: g.season, date: g.startDate, homeTeam: g.homeTeam, awayTeam: g.awayTeam, homeScore, awayScore };
  });

  const seasons = games.map((g) => g.season).filter((y) => Number.isFinite(y));
  const sinceSeason = seasons.length ? Math.min(...seasons) : undefined;

  return { team1, team2, team1Wins, team2Wins, ties, sinceSeason, games };
}

export function mapScoreboardRowsToGames(rows: SdvParsedScoreboardRow[], week: number): Game[] {
  return rows.map((r) => mapParsedScoreboardRow(r, week));
}
