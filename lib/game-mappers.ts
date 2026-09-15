import type {
  SdvCfbPicks,
  SdvCfbSummary,
  SdvCfbSummaryRaw,
  SdvEspnTeam,
} from './espn-types';
import type {
  AdvancedBoxScoreData,
  BettingGame,
  Game,
  GameDetail,
  GameMedia,
  GamePlayerStatEntry,
  GameTeamStatEntry,
  GameWeather,
  PlayerStat,
  PregameWinProbability,
  Venue,
} from './types';
import { num, numRequired } from '../utils/parse';
import { normalizeVenue } from '../utils/format';
import { espnTeamLogoUrl } from './team-index';

function mapLineScores(
  linescores: { value?: number | string; displayValue?: string }[] | undefined
): number[] | null {
  if (!linescores?.length) return null;
  return linescores.map((l) => {
    const fromValue = num(l.value);
    if (fromValue != null) return fromValue;
    return num(l.displayValue) ?? 0;
  });
}

/** Map a raw ESPN event (scoreboard or team schedule) to a Game. */
export function mapScheduleEvent(event: Record<string, unknown>, season: number): Game {
  const comp = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
  const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeTeam = home?.team as SdvEspnTeam | undefined;
  const awayTeam = away?.team as SdvEspnTeam | undefined;
  const homeScore = num((home?.score as { value?: unknown })?.value ?? home?.score);
  const awayScore = num((away?.score as { value?: unknown })?.value ?? away?.score);
  const status = comp?.status as { type?: { completed?: boolean; description?: string; state?: string } } | undefined;
  const weekObj = event.week as { number?: number } | undefined;
  const venueSource = (event.venue ?? comp?.venue) as Record<string, unknown> | undefined;
  const venue = venueSource ? normalizeVenue(venueSource) : undefined;
  const completed = Boolean(status?.type?.completed) || status?.type?.state === 'post';
  return {
    id: num(event.id) ?? 0,
    season,
    week: weekObj?.number ?? num(comp?.week) ?? 0,
    startDate: String(event.date ?? comp?.date ?? ''),
    completed,
    neutralSite: Boolean(comp?.neutralSite),
    conferenceGame: Boolean(comp?.conferenceCompetition),
    venue,
    homeTeam: homeTeam?.location ?? homeTeam?.displayName ?? '',
    awayTeam: awayTeam?.location ?? awayTeam?.displayName ?? '',
    homeTeamId: num(homeTeam?.id),
    awayTeamId: num(awayTeam?.id),
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: mapLineScores(
      home?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    awayLineScores: mapLineScores(
      away?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    homeLogo: competitorLogo(home, homeTeam),
    awayLogo: competitorLogo(away, awayTeam),
    homeRank: competitorRank(home),
    awayRank: competitorRank(away),
    broadcast: mapBroadcast(comp),
    status: status?.type?.description,
  };
}

function competitorLogo(
  competitor: Record<string, unknown> | undefined,
  team: SdvEspnTeam | undefined
): string | null {
  const href = team?.logos?.[0]?.href ?? team?.logo;
  if (href) return href;
  const id = team?.id ?? competitor?.id;
  if (typeof id === "string" || typeof id === "number") return espnTeamLogoUrl(id);
  return null;
}

function competitorRank(competitor: Record<string, unknown> | undefined): number | null {
  const curated = competitor?.curatedRank as { current?: unknown } | undefined;
  const value = num(curated?.current);
  if (value == null || value <= 0 || value > 25) return null;
  return value;
}

function mapBroadcast(comp: Record<string, unknown> | undefined): string | null {
  const broadcasts = comp?.broadcasts as Array<{ names?: string[]; media?: { shortName?: string } }> | undefined;
  const named = broadcasts?.[0]?.names?.[0] ?? broadcasts?.[0]?.media?.shortName;
  if (named) return named;
  const geo = (comp?.geoBroadcasts as Array<{ media?: { shortName?: string } }> | undefined)?.[0];
  return geo?.media?.shortName ?? null;
}

export function eventsFromPayload(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as { events?: unknown; leagues?: Array<{ events?: unknown }> };
  if (Array.isArray(obj.events)) return obj.events as Record<string, unknown>[];
  const nested = obj.leagues?.[0]?.events;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

export function eventsToGames(raw: unknown, season: number): Game[] {
  return eventsFromPayload(raw).map((e) => mapScheduleEvent(e, season));
}

/** Normalize `espnCfbSummary` raw JSON to the shape our mappers expect. */
export function normalizeSummary(raw: SdvCfbSummaryRaw, gameId?: number): SdvCfbSummary {
  const header = raw.header ?? {};
  const competitions = (header.competitions as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: gameId ?? numRequired(header.id),
    boxScore: raw.boxscore,
    gameInfo: raw.gameInfo,
    drives: raw.drives,
    leaders: raw.leaders,
    header: raw.header,
    teams: competitions[0]?.competitors,
    scoringPlays: raw.scoringPlays,
    winProbability: raw.winprobability,
    competitions,
    season: header.season,
    week: header.week,
    standings: raw.standings,
  };
}

export function summaryToPicks(raw: SdvCfbSummaryRaw, gameId?: number): SdvCfbPicks {
  const header = raw.header ?? {};
  const competitions = (header.competitions as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: gameId ?? numRequired(header.id),
    gameInfo: raw.gameInfo,
    leaders: raw.leaders,
    header: raw.header,
    teams: competitions[0]?.competitors,
    competitions,
    winProbability: raw.winprobability,
    pickcenter: raw.pickcenter,
    againstTheSpread: raw.againstTheSpread,
    odds: raw.odds,
    season: header.season,
    week: header.week,
    standings: raw.standings,
    predictor: raw.predictor,
  };
}

export function mapSummaryToGameDetail(summary: SdvCfbSummary): GameDetail {
  const header = summary.header as Record<string, unknown> | undefined;
  const competitions = (header?.competitions as Record<string, unknown>[] | undefined) ?? [];
  const comp = competitions[0];
  const gameId = num(summary.id ?? header?.id) ?? 0;
  const season = (summary.season as { year?: number })?.year ?? 0;
  const week = (summary.week as { number?: number })?.number ?? 0;
  const gameInfo = summary.gameInfo as Record<string, unknown> | undefined;
  const venue = gameInfo?.venue as Record<string, unknown> | undefined;

  const game = mapScheduleEvent(
    { id: gameId, venue: venue as Venue | undefined, date: comp?.date, week: { number: week }, competitions: [comp] },
    season
  );

  const boxScore = summary.boxScore as Record<string, unknown> | undefined;
  const teamStats: GameTeamStatEntry[] = [];
  const playerStats: GamePlayerStatEntry[] = [];

  if (boxScore?.teams) {
    const teams = boxScore.teams as Record<string, unknown>[];
    const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
    const colorByHomeAway = new Map<string, { color?: string; alternateColor?: string }>();
    for (const c of competitors) {
      const t = c.team as SdvEspnTeam | undefined;
      const ha = String(c.homeAway ?? '');
      if (t && ha) {
        colorByHomeAway.set(ha, {
          color: t.color ? `#${String(t.color).replace('#', '')}` : undefined,
          alternateColor: t.alternateColor
            ? `#${String(t.alternateColor).replace('#', '')}`
            : undefined,
        });
      }
    }
    teamStats.push({
      id: gameId,
      teams: teams.map((t) => {
        const teamInfo = t.team as SdvEspnTeam;
        const stats = (t.statistics as { name?: string; displayValue?: string; label?: string }[] | undefined) ?? [];
        const homeAway = String(t.homeAway ?? '');
        const fromComp = colorByHomeAway.get(homeAway);
        const color = teamInfo.color
          ? `#${String(teamInfo.color).replace('#', '')}`
          : fromComp?.color ?? null;
        const alternateColor = teamInfo.alternateColor
          ? `#${String(teamInfo.alternateColor).replace('#', '')}`
          : fromComp?.alternateColor ?? null;
        return {
          teamId: num(teamInfo.id) ?? 0,
          team: teamInfo.location ?? teamInfo.displayName ?? '',
          homeAway,
          points: num((t as { score?: unknown }).score),
          color,
          alternateColor,
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
          const athletes = (cat.athletes as Record<string, unknown>[] | undefined) ?? [];
          const labels = (cat.labels as string[] | undefined) ?? [];
          return {
            name: String(cat.name ?? cat.text ?? ''),
            athletes: athletes.map((a) => {
              const athlete = a.athlete as { id?: string; displayName?: string; fullName?: string };
              const stats = (a.stats as string[] | undefined) ?? [];
              const paired =
                labels.length > 0
                  ? stats
                      .map((s, i) => (labels[i] ? `${labels[i]} ${s}` : s))
                      .filter(Boolean)
                      .join(', ')
                  : stats.join(' ');
              return {
                id: String(athlete?.id ?? ''),
                name: athlete?.displayName ?? athlete?.fullName ?? '',
                stat: paired,
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

  const advancedBoxScore: AdvancedBoxScoreData = {
    gameInfo: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: venue ? normalizeVenue(venue) : undefined,
    },
    teams: boxScore?.teams as Record<string, unknown> | undefined,
  };

  return { game, teamStats, playerStats, advancedBoxScore, venue: venue ? normalizeVenue(venue) : undefined };
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
  }

  const predictor = picks.predictor as {
    homeTeam?: { gameProjection?: string | number };
  } | undefined;
  const projection = num(predictor?.homeTeam?.gameProjection);
  if (projection != null) {
    homeWinProbability = projection > 1 ? projection / 100 : projection;
  } else {
    const winProbArr = (picks.winProbability as { homeWinPercentage?: number }[] | undefined) ?? [];
    if (winProbArr[0]?.homeWinPercentage != null) {
      homeWinProbability = winProbArr[0].homeWinPercentage;
    }
  }

  const odds: PregameWinProbability | null = firstOdds || projection != null
    ? { gameId: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, spread, homeWinProbability }
    : null;

  const lines: BettingGame | null = firstOdds
    ? {
      id: game.id,
      lines: [{ spread, overUnder: num(firstOdds.overUnder) ?? 0, provider: 'ESPN' }],
    }
    : null;

  const header = picks.header as Record<string, unknown> | undefined;
  const competitions = (header?.competitions as Record<string, unknown>[] | undefined) ?? [];
  const headerBroadcasts =
    (competitions[0]?.broadcasts as {
      names?: string[];
      media?: { shortName?: string };
      type?: { shortName?: string };
    }[] | undefined) ?? [];
  const media: GameMedia[] = headerBroadcasts.flatMap((b) => {
    const outlet = b.media?.shortName ?? b.names?.[0];
    if (!outlet) return [];
    return [
      {
        outlet,
        mediaType: b.type?.shortName ?? 'TV',
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
      },
    ];
  });

  const gameInfo = picks.gameInfo as {
    weather?: Record<string, unknown>;
    venue?: { indoor?: boolean };
  } | undefined;
  const weatherInfo = gameInfo?.weather;
  const weather: GameWeather | null = weatherInfo
    ? {
      gameIndoors: Boolean(gameInfo?.venue?.indoor ?? game.venue?.indoor),
      temperature: num(weatherInfo.temperature),
      humidity: num(weatherInfo.humidity),
      windSpeed: num(weatherInfo.gust ?? weatherInfo.windSpeed),
      windDirection: num(weatherInfo.windDirection),
      precipitation: num(weatherInfo.precipitation),
      snowfall: num(weatherInfo.snowfall),
      condition: {
        description: String(
          weatherInfo.displayValue ??
            (weatherInfo.precipitation != null && Number(weatherInfo.precipitation) > 0
              ? `Precip ${weatherInfo.precipitation}%`
              : weatherInfo.temperature != null
                ? `${weatherInfo.temperature}°F`
                : 'Weather forecast')
        ),
      },
    }
    : null;

  return { odds, lines, media, weather };
}

export function mapLeadersToPlayerStats(leaders: Record<string, unknown>[], season: number): PlayerStat[] {
  const results: PlayerStat[] = [];
  for (const group of leaders) {
    const teamInfo = group.team as SdvEspnTeam | undefined;
    const teamName = teamInfo?.location ?? teamInfo?.displayName ?? teamInfo?.shortDisplayName ?? '';
    const categories = (group.leaders as Record<string, unknown>[] | undefined) ?? [];
    for (const category of categories) {
      const categoryName = String(category.displayName ?? category.name ?? '');
      const categoryLeaders = (category.leaders as Record<string, unknown>[] | undefined) ?? [];
      for (const leader of categoryLeaders) {
        const athlete = leader.athlete as {
          id?: string;
          displayName?: string;
          position?: { abbreviation?: string };
        };
        const leaderTeam = (leader.team as SdvEspnTeam | undefined) ?? teamInfo;
        results.push({
          playerId: String(athlete?.id ?? ''),
          player: athlete?.displayName ?? '',
          team: leaderTeam?.location ?? leaderTeam?.displayName ?? teamName,
          position: athlete?.position?.abbreviation ?? '',
          category: categoryName,
          statType: categoryName,
          stat: String(leader.displayValue ?? leader.value ?? ''),
          season,
        });
      }
    }
  }
  return results;
}

export type GameLeaderEntry = {
  team: string;
  category: string;
  player: string;
  displayValue: string;
};

export function mapSummaryGameLeaders(leaders: Record<string, unknown>[]): GameLeaderEntry[] {
  return mapLeadersToPlayerStats(leaders, 0).map((s) => ({
    team: s.team,
    category: s.category,
    player: s.player,
    displayValue: s.stat,
  }));
}

export type ScoringPlayEntry = {
  id: string;
  text: string;
  team: string;
  period: number;
  clock: string;
  homeScore: number | null;
  awayScore: number | null;
  scoringType: string;
};

export function mapScoringPlays(raw: unknown): ScoringPlayEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((play, index) => {
    const p = play as Record<string, unknown>;
    const team = p.team as SdvEspnTeam | undefined;
    const clock = p.clock as { displayValue?: string } | undefined;
    const period = p.period as { number?: number } | number | undefined;
    const scoringType = p.scoringType as { displayName?: string; name?: string } | undefined;
    return {
      id: String(p.id ?? index),
      text: String(p.text ?? p.shortText ?? ''),
      team: team?.location ?? team?.displayName ?? team?.abbreviation ?? '',
      period: typeof period === 'number' ? period : period?.number ?? 0,
      clock: clock?.displayValue ?? '',
      homeScore: num(p.homeScore),
      awayScore: num(p.awayScore),
      scoringType: scoringType?.displayName ?? scoringType?.name ?? '',
    };
  });
}

type SummaryDrives = {
  previous?: Array<{ plays?: unknown[] }>;
  current?: Array<{ plays?: unknown[] }>;
};

export function drivesFromSummary(raw: { drives?: SummaryDrives | unknown }) {
  const drives = raw.drives as SummaryDrives | undefined;
  return [...(drives?.previous ?? []), ...(drives?.current ?? [])];
}
