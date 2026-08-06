import type {
  SdvParsedRosterRow,
  SdvParsedScoreboardRow,
  SdvParsedStandingsRow,
  SdvParsedTeamScheduleRow,
  SdvSeasonCoachEntry,
  SdvSeasonInfo,
  SdvStandingsResponse,
  SdvTeamResponse,
  SdvTeamScheduleResponse,
} from '../espn-types';
import { getCfb, sdvRequest } from '../espn-client';
import { FBS_GROUP, REGULAR_SEASON_TYPE } from '../espn-constants';
import {
  getTeamSchedule,
  mapParsedScoreboardRow,
  mapParsedTeamScheduleRow,
} from '../schedule-service';
import { mapEspnTeamToTeam } from '../team-index';
import { buildSeasonContext } from '../season-context';
import {
  GamesRepo,
  mapSummaryToGameDetail,
  normalizeSummary,
} from '../../repos/games-repo';
import {
  TeamsRepo,
  mapParsedRosterRows,
  mapSeasonCoachEntry,
} from '../../repos/teams-repo';
import {
  ConferencesRepo,
  mapParsedStandingsToRecord,
} from '../../repos/conferences-repo';
import {
  RankingsRepo,
  fetchParsedRankings,
  normalizeRankingsPayload,
  parsePollWeek,
} from '../../repos/rankings-repo';
import {
  fetchSeasonPowerIndex,
  parsePowerIndexRow,
} from '../../repos/ratings-repo';
import { NewsRepo } from '../../repos/news-repo';
import { LeadersRepo } from '../../repos/leaders-repo';
import { DepthChartRepo } from '../../repos/depth-chart-repo';
import { ScoreboardRepo } from '../../repos/scoreboard-repo';
import { FbsRepo } from '../../repos/fbs-repo';
import type {
  CatalogEntry,
  CheckLayer,
  CheckResult,
  CheckStatus,
  ContractContext,
  SeasonKind,
} from './types';
import { isEmptyPayload, missingPaths, requireKeys } from './paths';
import { UI_FIELD_INVENTORY } from './ui-fields';

function result(
  entryId: string,
  ctx: ContractContext,
  layer: CheckLayer,
  status: CheckStatus,
  message: string,
  detail?: unknown
): CheckResult {
  return {
    entryId,
    layer,
    season: ctx.season,
    seasonKind: ctx.seasonKind,
    status,
    message,
    detail,
  };
}

function assertObjectFields(
  entryId: string,
  ctx: ContractContext,
  layer: CheckLayer,
  obj: unknown,
  keys: readonly string[],
  label: string
): CheckResult {
  const missing = requireKeys(obj, [...keys]);
  return missing.length
    ? result(entryId, ctx, layer, 'missing_field', `${label} missing: ${missing.join(', ')}`, missing)
    : result(entryId, ctx, layer, 'ok', `${label} fields present`);
}

async function safe<T>(
  entryId: string,
  ctx: ContractContext,
  layer: CheckLayer,
  label: string,
  fn: () => Promise<T>
): Promise<{ value?: T; error?: CheckResult }> {
  try {
    return { value: await fn() };
  } catch (err) {
    return {
      error: result(
        entryId,
        ctx,
        layer,
        'error',
        `${label}: ${err instanceof Error ? err.message : String(err)}`
      ),
    };
  }
}

async function cfbRequest<T>(
  cacheKey: string,
  call: (cfb: Awaited<ReturnType<typeof getCfb>>) => Promise<unknown>
): Promise<T> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await call(cfb)) as T;
  }, { cacheKey });
}

function currentMayBeEmpty(ctx: ContractContext): CheckStatus {
  return ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field';
}

const gamesRepo = new GamesRepo();
const teamsRepo = new TeamsRepo();
const rankingsRepo = new RankingsRepo();
const newsRepo = new NewsRepo();
const leadersRepo = new LeadersRepo();
const depthRepo = new DepthChartRepo();
const conferencesRepo = new ConferencesRepo();
const scoreboardRepo = new ScoreboardRepo();
const fbsRepo = new FbsRepo();

export const CATALOG: CatalogEntry[] = [
  {
    id: 'scoreboard.parsed',
    area: 'scoreboard',
    wrapper: 'espnCfbScoreboard',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      let rowsResult = await safe(
        'scoreboard.parsed',
        ctx,
        'shape',
        'espnCfbScoreboard week 1',
        () =>
          cfbRequest<SdvParsedScoreboardRow[]>(
            `contract:scoreboard:${ctx.season}:1`,
            (cfb) =>
              cfb.espnCfbScoreboard({
                dates: ctx.season,
                week: 1,
                season_type: REGULAR_SEASON_TYPE,
                groups: FBS_GROUP,
                limit: 300,
                parsed: true,
              })
          )
      );
      if (rowsResult.error) return [rowsResult.error];
      if (!Array.isArray(rowsResult.value) || rowsResult.value.length === 0) {
        rowsResult = await safe(
          'scoreboard.parsed',
          ctx,
          'shape',
          'espnCfbScoreboard season',
          () =>
            cfbRequest<SdvParsedScoreboardRow[]>(
              `contract:scoreboard:${ctx.season}:all`,
              (cfb) =>
                cfb.espnCfbScoreboard({
                  dates: ctx.season,
                  season_type: REGULAR_SEASON_TYPE,
                  groups: FBS_GROUP,
                  limit: 300,
                  parsed: true,
                })
            )
        );
      }
      if (rowsResult.error) return [rowsResult.error];
      const rows = rowsResult.value;
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'scoreboard.parsed',
            ctx,
            'shape',
            currentMayBeEmpty(ctx),
            'scoreboard returned no rows'
          ),
        ];
      }

      const row = rows[0];
      const missing = missingPaths(row, ['game_id', 'home_id', 'away_id', 'date']);
      out.push(
        missing.length
          ? result('scoreboard.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
          : result('scoreboard.parsed', ctx, 'shape', 'ok', `scoreboard rows=${rows.length}`)
      );
      try {
        const game = mapParsedScoreboardRow(row, 1);
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'mapper', game, UI_FIELD_INVENTORY.game, 'mapped Game'));
        if (!game.homeTeam || !game.awayTeam) {
          out.push(result('scoreboard.parsed', ctx, 'mapper', 'semantic_mismatch', 'mapped Game missing team names'));
        }
      } catch (err) {
        out.push(result('scoreboard.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err)));
      }

      const repo = await safe('scoreboard.parsed', ctx, 'repo', 'GamesRepo.getWeekGamesFromScoreboard', () =>
        gamesRepo.getWeekGamesFromScoreboard(ctx.season, 1)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.game, 'repo Game'));
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.game, 'UI Game'));
      } else {
        out.push(result('scoreboard.parsed', ctx, 'repo', currentMayBeEmpty(ctx), 'repo week games empty'));
      }
      return out;
    },
  },
  {
    id: 'schedule.parsed',
    area: 'schedule',
    wrapper: 'espnCfbTeamSchedule',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('schedule.parsed', ctx, 'shape', 'espnCfbTeamSchedule parsed', () =>
        cfbRequest<SdvParsedTeamScheduleRow[]>(
          `contract:schedule:parsed:${ctx.teamId}:${ctx.season}`,
          (cfb) =>
            cfb.espnCfbTeamSchedule({
              team_id: String(ctx.teamId),
              season: ctx.season,
              parsed: true,
            })
        )
      );
      if (fetched.error) return [fetched.error];
      const rows = fetched.value;
      if (!Array.isArray(rows) || rows.length === 0) {
        return [result('schedule.parsed', ctx, 'shape', currentMayBeEmpty(ctx), 'team schedule empty')];
      }
      const row = rows[0];
      const missing = missingPaths(row, ['id', 'date', 'season_year']);
      out.push(
        missing.length
          ? result('schedule.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
          : result('schedule.parsed', ctx, 'shape', 'ok', `schedule rows=${rows.length}`)
      );
      try {
        const game = mapParsedTeamScheduleRow(row);
        out.push(assertObjectFields('schedule.parsed', ctx, 'mapper', game, UI_FIELD_INVENTORY.game, 'mapped schedule Game'));
        out.push(
          game.season === ctx.season || game.season === 0
            ? result('schedule.parsed', ctx, 'mapper', 'ok', `season matches ${ctx.season}`)
            : result('schedule.parsed', ctx, 'mapper', 'semantic_mismatch', `mapped season ${game.season} != ${ctx.season}`)
        );
      } catch (err) {
        out.push(result('schedule.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err)));
      }
      const repo = await safe('schedule.parsed', ctx, 'repo', 'getTeamSchedule', () =>
        getTeamSchedule(ctx.teamSchool, ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('schedule.parsed', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.game, 'repo schedule'));
        out.push(assertObjectFields('schedule.parsed', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.game, 'UI schedule'));
      } else {
        out.push(result('schedule.parsed', ctx, 'repo', currentMayBeEmpty(ctx), 'repo schedule empty'));
      }
      return out;
    },
  },
  {
    id: 'schedule.raw',
    area: 'schedule',
    wrapper: 'espnCfbTeamSchedule raw',
    run: async (ctx) => {
      const fetched = await safe('schedule.raw', ctx, 'shape', 'espnCfbTeamSchedule raw', () =>
        cfbRequest<SdvTeamScheduleResponse>(
          `contract:schedule:raw:${ctx.teamId}:${ctx.season}`,
          (cfb) => cfb.espnCfbTeamSchedule({ team_id: String(ctx.teamId), season: ctx.season })
        )
      );
      if (fetched.error) return [fetched.error];
      const count = fetched.value?.events?.length ?? 0;
      return [
        count
          ? result('schedule.raw', ctx, 'shape', 'ok', `raw events=${count}`)
          : result('schedule.raw', ctx, 'shape', currentMayBeEmpty(ctx), 'raw schedule events empty'),
      ];
    },
  },
  {
    id: 'standings.parsed',
    area: 'standings',
    wrapper: 'espnCfbStandings parsed',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('standings.parsed', ctx, 'shape', 'espnCfbStandings parsed', () =>
        cfbRequest<SdvParsedStandingsRow[]>(
          `contract:standings:parsed:${ctx.season}`,
          (cfb) => cfb.espnCfbStandings({ season: ctx.season, group: FBS_GROUP, parsed: true })
        )
      );
      if (fetched.error) return [fetched.error];
      const rows = fetched.value;
      if (!Array.isArray(rows) || rows.length === 0) {
        return [result('standings.parsed', ctx, 'shape', currentMayBeEmpty(ctx), 'parsed standings empty')];
      }
      const row = rows.find((candidate) => Number(candidate.team_id) === ctx.teamId) ?? rows[0];
      const missing = missingPaths(row, ['team_id', 'team_location']);
      out.push(
        missing.length
          ? result('standings.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
          : result('standings.parsed', ctx, 'shape', 'ok', `standings rows=${rows.length}`)
      );
      const record = mapParsedStandingsToRecord(row, ctx.season, String(row.group_abbreviation ?? 'FBS'));
      out.push(assertObjectFields('standings.parsed', ctx, 'mapper', record, UI_FIELD_INVENTORY.teamRecords, 'mapped TeamRecords'));
      if (typeof row.overall === 'string' && row.overall.includes('-')) {
        out.push(
          record.total.wins === 0 && record.total.losses === 0 && !row.overall.startsWith('0-0')
            ? result('standings.parsed', ctx, 'mapper', 'semantic_mismatch', `overall "${row.overall}" did not map to W-L`)
            : result('standings.parsed', ctx, 'mapper', 'ok', `overall "${row.overall}" mapped`)
        );
      }
      const repo = await safe('standings.parsed', ctx, 'repo', 'ConferencesRepo.getFbsRecords', () =>
        conferencesRepo.getFbsRecords(ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('standings.parsed', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.teamRecords, 'repo TeamRecords'));
        out.push(assertObjectFields('standings.parsed', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.teamRecords, 'UI TeamRecords'));
        out.push(assertObjectFields('standings.parsed', ctx, 'ui', repo.value[0].total, UI_FIELD_INVENTORY.teamRecord, 'UI TeamRecord.total'));
      } else {
        out.push(result('standings.parsed', ctx, 'repo', currentMayBeEmpty(ctx), 'fbs records empty'));
      }
      return out;
    },
  },
  {
    id: 'standings.raw',
    area: 'standings',
    wrapper: 'espnCfbStandings raw',
    run: async (ctx) => {
      const fetched = await safe('standings.raw', ctx, 'shape', 'espnCfbStandings raw', () =>
        cfbRequest<SdvStandingsResponse>(
          `contract:standings:raw:${ctx.season}`,
          (cfb) => cfb.espnCfbStandings({ season: ctx.season, group: FBS_GROUP })
        )
      );
      if (fetched.error) return [fetched.error];
      const raw = fetched.value;
      if (isEmptyPayload(raw)) {
        return [result('standings.raw', ctx, 'shape', currentMayBeEmpty(ctx), 'raw standings empty')];
      }
      const hasEntries =
        Array.isArray(raw?.standings?.entries) ||
        (Array.isArray(raw?.children) && raw.children.length > 0);
      return [
        hasEntries
          ? result('standings.raw', ctx, 'shape', 'ok', 'raw standings has entries/children')
          : result('standings.raw', ctx, 'shape', 'missing_field', 'raw standings missing entries/children'),
      ];
    },
  },
  {
    id: 'rankings.parsed',
    area: 'rankings',
    wrapper: 'fetchParsedRankings',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('rankings.parsed', ctx, 'shape', 'fetchParsedRankings', () =>
        fetchParsedRankings(ctx.season)
      );
      if (fetched.error) return [fetched.error];
      const normalized = normalizeRankingsPayload(fetched.value);
      const polls = (normalized.rankings as unknown[] | undefined) ?? [];
      if (!polls.length) {
        return [result('rankings.parsed', ctx, 'shape', currentMayBeEmpty(ctx), 'rankings empty')];
      }
      out.push(result('rankings.parsed', ctx, 'shape', 'ok', `rankings polls=${polls.length}`));
      const pollWeek = parsePollWeek(normalized);
      out.push(assertObjectFields('rankings.parsed', ctx, 'mapper', pollWeek, UI_FIELD_INVENTORY.pollWeek, 'PollWeek'));
      if (pollWeek.polls[0]) {
        out.push(assertObjectFields('rankings.parsed', ctx, 'mapper', pollWeek.polls[0], UI_FIELD_INVENTORY.poll, 'Poll'));
        if (pollWeek.polls[0].ranks[0]) {
          out.push(assertObjectFields('rankings.parsed', ctx, 'mapper', pollWeek.polls[0].ranks[0], UI_FIELD_INVENTORY.pollRank, 'PollRank'));
        }
      }
      if (ctx.seasonKind === 'prior' && pollWeek.season && pollWeek.season !== ctx.season) {
        out.push(result('rankings.parsed', ctx, 'mapper', 'semantic_mismatch', `PollWeek.season ${pollWeek.season} != ${ctx.season}`));
      } else if (ctx.seasonKind === 'current' && pollWeek.season && pollWeek.season !== ctx.season) {
        out.push(result('rankings.parsed', ctx, 'mapper', 'expected_empty', `live rankings season ${pollWeek.season}`));
      } else {
        out.push(result('rankings.parsed', ctx, 'mapper', 'ok', `PollWeek.season=${pollWeek.season}`));
      }
      const repo = await safe('rankings.parsed', ctx, 'repo', 'RankingsRepo.getRankings', () =>
        rankingsRepo.getRankings(ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value) {
        out.push(assertObjectFields('rankings.parsed', ctx, 'repo', repo.value, UI_FIELD_INVENTORY.pollWeek, 'repo PollWeek'));
        out.push(assertObjectFields('rankings.parsed', ctx, 'ui', repo.value, UI_FIELD_INVENTORY.pollWeek, 'UI PollWeek'));
      }
      return out;
    },
  },
  {
    id: 'powerindex.parsed',
    area: 'rankings',
    wrapper: 'fetchSeasonPowerIndex',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('powerindex.parsed', ctx, 'shape', 'fetchSeasonPowerIndex', () =>
        fetchSeasonPowerIndex(ctx.season)
      );
      if (fetched.error) return [fetched.error];
      const rows = fetched.value;
      if (!Array.isArray(rows) || rows.length === 0) {
        return [result('powerindex.parsed', ctx, 'shape', currentMayBeEmpty(ctx), 'power index empty')];
      }
      out.push(result('powerindex.parsed', ctx, 'shape', 'ok', `powerindex rows=${rows.length}`));
      try {
        const parsed = parsePowerIndexRow(rows[0]);
        out.push(
          parsed?.teamId
            ? result('powerindex.parsed', ctx, 'mapper', 'ok', `teamId=${parsed.teamId}`)
            : result('powerindex.parsed', ctx, 'mapper', 'semantic_mismatch', 'power index row missing teamId')
        );
      } catch (err) {
        out.push(result('powerindex.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err)));
      }
      const repo = await safe('powerindex.parsed', ctx, 'repo', 'FbsRepo.getFpiRankings', () =>
        fbsRepo.getFpiRankings(ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else {
        out.push(
          repo.value && repo.value.size > 0
            ? result('powerindex.parsed', ctx, 'repo', 'ok', `fpi rankings size=${repo.value.size}`)
            : result('powerindex.parsed', ctx, 'repo', currentMayBeEmpty(ctx), 'fpi rankings empty')
        );
      }
      return out;
    },
  },
  {
    id: 'season.info',
    area: 'calendar',
    wrapper: 'espnCfbSeasonInfo / buildSeasonContext',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('season.info', ctx, 'shape', 'espnCfbSeasonInfo', () =>
        cfbRequest<SdvSeasonInfo>(
          `contract:seasonInfo:${ctx.season}`,
          (cfb) => cfb.espnCfbSeasonInfo({ season: ctx.season })
        )
      );
      if (fetched.error) return [fetched.error];
      const info = fetched.value;
      const missing = missingPaths(info, ['year', 'startDate', 'endDate', 'type', 'types']);
      out.push(
        missing.length
          ? result('season.info', ctx, 'shape', 'missing_field', `season info missing ${missing.join(',')}`, missing)
          : result('season.info', ctx, 'shape', 'ok', `season ${info?.year} type=${info?.type?.name}`)
      );
      out.push(
        Number(info?.year) === ctx.season
          ? result('season.info', ctx, 'mapper', 'ok', `year=${ctx.season}`)
          : result('season.info', ctx, 'mapper', 'semantic_mismatch', `year ${info?.year} != ${ctx.season}`)
      );
      if (!info?.types?.items?.length) {
        out.push(result('season.info', ctx, 'shape', 'missing_field', 'types.items empty'));
      }
      const repo = await safe('season.info', ctx, 'repo', 'buildSeasonContext', () =>
        buildSeasonContext(ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value) {
        const keys = ['year', 'phase', 'startDate', 'endDate', 'isActive', 'seasonStarted', 'firstGameDate'] as const;
        out.push(assertObjectFields('season.info', ctx, 'repo', repo.value, keys, 'SeasonContext'));
        out.push(assertObjectFields('season.info', ctx, 'ui', repo.value, keys, 'UI SeasonContext'));
        if (ctx.seasonKind === 'prior' && (repo.value.isActive || repo.value.phase !== 'offseason')) {
          out.push(result('season.info', ctx, 'repo', 'semantic_mismatch', `prior season active=${repo.value.isActive} phase=${repo.value.phase}`));
        }
        if (repo.value.year !== ctx.season) {
          out.push(result('season.info', ctx, 'repo', 'semantic_mismatch', `context year ${repo.value.year}`));
        }
      }
      return out;
    },
  },
  {
    id: 'season.weeks',
    area: 'calendar',
    wrapper: 'espnCfbSeasonWeeks / ScoreboardRepo.getCalendar',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('season.weeks', ctx, 'shape', 'espnCfbSeasonWeeks', () =>
        cfbRequest<{ items?: Array<{ '$ref'?: string }> }>(
          `contract:seasonWeeks:${ctx.season}:${REGULAR_SEASON_TYPE}`,
          (cfb) => cfb.espnCfbSeasonWeeks({ season: ctx.season, season_type: REGULAR_SEASON_TYPE })
        )
      );
      if (fetched.error) return [fetched.error];
      const refs = fetched.value?.items ?? [];
      out.push(
        refs.length
          ? result('season.weeks', ctx, 'shape', 'ok', `week refs=${refs.length}`)
          : result('season.weeks', ctx, 'shape', currentMayBeEmpty(ctx), 'season weeks empty')
      );
      const repo = await safe('season.weeks', ctx, 'repo', 'ScoreboardRepo.getCalendar', () =>
        scoreboardRepo.getCalendar(ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('season.weeks', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.calendarWeek, 'CalendarWeek'));
        out.push(assertObjectFields('season.weeks', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.calendarWeek, 'UI CalendarWeek'));
      } else {
        out.push(result('season.weeks', ctx, 'repo', currentMayBeEmpty(ctx), 'calendar empty'));
      }
      return out;
    },
  },
  {
    id: 'game.summary',
    area: 'game',
    wrapper: 'GamesRepo.getGameSummaryRaw / getGameDetail',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) {
        return [result('game.summary', ctx, 'shape', currentMayBeEmpty(ctx), 'no gameId from schedule')];
      }
      const out: CheckResult[] = [];
      const fetched = await safe('game.summary', ctx, 'shape', 'GamesRepo.getGameSummaryRaw', () =>
        gamesRepo.getGameSummaryRaw(gameId)
      );
      if (fetched.error) return [fetched.error];
      const raw = fetched.value;
      out.push(
        raw?.header
          ? result('game.summary', ctx, 'shape', 'ok', `summary gameId=${gameId}`)
          : result('game.summary', ctx, 'shape', 'missing_field', 'summary missing header')
      );
      try {
        const detail = mapSummaryToGameDetail(normalizeSummary(raw ?? {}, gameId));
        out.push(assertObjectFields('game.summary', ctx, 'mapper', detail, UI_FIELD_INVENTORY.gameDetail, 'GameDetail'));
        if (detail.game) {
          out.push(assertObjectFields('game.summary', ctx, 'mapper', detail.game, UI_FIELD_INVENTORY.game, 'GameDetail.game'));
        }
      } catch (err) {
        out.push(result('game.summary', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err)));
      }
      const repo = await safe('game.summary', ctx, 'repo', 'GamesRepo.getGameDetail', () =>
        gamesRepo.getGameDetail(gameId)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value) {
        out.push(assertObjectFields('game.summary', ctx, 'repo', repo.value, UI_FIELD_INVENTORY.gameDetail, 'repo GameDetail'));
        out.push(assertObjectFields('game.summary', ctx, 'ui', repo.value, UI_FIELD_INVENTORY.gameDetail, 'UI GameDetail'));
      }
      return out;
    },
  },
  {
    id: 'game.picks',
    area: 'game',
    wrapper: 'GamesRepo.getGamePicks',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) return [result('game.picks', ctx, 'repo', 'expected_empty', 'no gameId')];
      const fetched = await safe('game.picks', ctx, 'repo', 'GamesRepo.getGamePicks', () =>
        gamesRepo.getGamePicks(gameId)
      );
      if (fetched.error) return [fetched.error];
      const picks = fetched.value;
      return [
        !picks?.header && !picks?.pickcenter
          ? result('game.picks', ctx, 'repo', 'expected_empty', 'picks/header empty (ok for some games)')
          : result('game.picks', ctx, 'repo', 'ok', `picks id=${picks.id}`),
      ];
    },
  },
  {
    id: 'game.drives_plays',
    area: 'game',
    wrapper: 'GamesRepo.getGameSummaryRaw',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) return [result('game.drives_plays', ctx, 'shape', 'expected_empty', 'no gameId')];
      const fetched = await safe('game.drives_plays', ctx, 'shape', 'GamesRepo.getGameSummaryRaw', () =>
        gamesRepo.getGameSummaryRaw(gameId)
      );
      if (fetched.error) return [fetched.error];
      const drivesPayload = fetched.value?.drives as
        | { previous?: Array<{ plays?: unknown[] }>; current?: Array<{ plays?: unknown[] }> }
        | undefined;
      const drives = [...(drivesPayload?.previous ?? []), ...(drivesPayload?.current ?? [])];
      const plays = drives.flatMap((drive) => drive.plays ?? []);
      return [
        drives.length
          ? result('game.drives_plays', ctx, 'shape', 'ok', `drives=${drives.length}`)
          : result('game.drives_plays', ctx, 'shape', 'expected_empty', 'drives empty (pregame / not final)'),
        plays.length
          ? result('game.drives_plays', ctx, 'shape', 'ok', `plays=${plays.length}`)
          : result('game.drives_plays', ctx, 'shape', 'expected_empty', 'plays empty'),
      ];
    },
  },
  {
    id: 'team.info',
    area: 'team',
    wrapper: 'espnCfbTeam',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('team.info', ctx, 'shape', 'espnCfbTeam', () =>
        cfbRequest<SdvTeamResponse>(
          `contract:team:${ctx.teamId}`,
          (cfb) => cfb.espnCfbTeam({ team_id: ctx.teamId })
        )
      );
      if (fetched.error) return [fetched.error];
      const team = fetched.value?.team;
      if (!team) return [result('team.info', ctx, 'shape', 'missing_field', 'team response missing team')];
      out.push(result('team.info', ctx, 'shape', 'ok', `team ${team.displayName ?? team.location}`));
      const mapped = mapEspnTeamToTeam(team);
      out.push(assertObjectFields('team.info', ctx, 'mapper', mapped, UI_FIELD_INVENTORY.team, 'mapped Team'));
      if (mapped.id !== ctx.teamId) {
        out.push(result('team.info', ctx, 'mapper', 'semantic_mismatch', `mapped id ${mapped.id} != ${ctx.teamId}`));
      }
      const repo = await safe('team.info', ctx, 'repo', 'TeamsRepo.getTeamInfo', () =>
        teamsRepo.getTeamInfo(String(ctx.teamId), ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value) {
        out.push(assertObjectFields('team.info', ctx, 'repo', repo.value, UI_FIELD_INVENTORY.team, 'repo Team'));
        out.push(assertObjectFields('team.info', ctx, 'ui', repo.value, UI_FIELD_INVENTORY.team, 'UI Team'));
      } else {
        out.push(result('team.info', ctx, 'repo', 'missing_field', 'getTeamInfo returned null'));
      }
      return out;
    },
  },
  {
    id: 'team.roster',
    area: 'team',
    wrapper: 'espnCfbTeamRoster',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('team.roster', ctx, 'shape', 'espnCfbTeamRoster parsed', () =>
        cfbRequest<SdvParsedRosterRow[]>(
          `contract:roster:${ctx.teamId}`,
          (cfb) => cfb.espnCfbTeamRoster({ team_id: ctx.teamId, parsed: true })
        )
      );
      if (fetched.error) return [fetched.error];
      const rows = fetched.value;
      if (!Array.isArray(rows) || rows.length === 0) {
        return [result('team.roster', ctx, 'shape', currentMayBeEmpty(ctx), 'roster empty')];
      }
      out.push(result('team.roster', ctx, 'shape', 'ok', `roster rows=${rows.length}`));
      const mapped = mapParsedRosterRows(rows, ctx.teamSchool, ctx.season);
      if (!mapped.length) {
        out.push(result('team.roster', ctx, 'mapper', 'map_error', 'mapParsedRosterRows returned []'));
      } else {
        out.push(assertObjectFields('team.roster', ctx, 'mapper', mapped[0], UI_FIELD_INVENTORY.rosterPlayer, 'mapped RosterPlayer'));
      }
      const repo = await safe('team.roster', ctx, 'repo', 'TeamsRepo.getRoster', () =>
        teamsRepo.getRoster(ctx.teamSchool, ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('team.roster', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.rosterPlayer, 'repo roster'));
        out.push(assertObjectFields('team.roster', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.rosterPlayer, 'UI roster'));
      } else {
        out.push(result('team.roster', ctx, 'repo', currentMayBeEmpty(ctx), 'repo roster empty'));
      }
      return out;
    },
  },
  {
    id: 'team.coach',
    area: 'coach',
    wrapper: 'espnCfbTeam / TeamsRepo.getCoaches',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const fetched = await safe('team.coach', ctx, 'shape', 'espnCfbTeam coach fragment', () =>
        cfbRequest<SdvTeamResponse>(
          `contract:teamCoach:${ctx.teamId}`,
          (cfb) => cfb.espnCfbTeam({ team_id: ctx.teamId })
        )
      );
      if (fetched.error) return [fetched.error];
      const coach = fetched.value?.team?.coach;
      if (coach?.firstName || coach?.lastName) {
        out.push(result('team.coach', ctx, 'shape', 'ok', `coach ${coach.firstName ?? ''} ${coach.lastName ?? ''}`.trim()));
        const entry: SdvSeasonCoachEntry = {
          firstName: coach.firstName,
          lastName: coach.lastName,
          team: { '$ref': `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams/${ctx.teamId}` },
        };
        const mapped = mapSeasonCoachEntry(entry, ctx.teamSchool, ctx.season);
        if (mapped[0]) {
          out.push(assertObjectFields('team.coach', ctx, 'mapper', mapped[0], UI_FIELD_INVENTORY.coach, 'mapped Coach'));
        }
      } else {
        // Team endpoint often omits coach; TeamsRepo falls back to season coach refs.
        out.push(result('team.coach', ctx, 'shape', 'expected_empty', 'team coach fragment empty'));
      }
      const repo = await safe('team.coach', ctx, 'repo', 'TeamsRepo.getCoaches', () =>
        teamsRepo.getCoaches(ctx.teamSchool, ctx.season)
      );
      if (repo.error) out.push(repo.error);
      else if (repo.value?.length) {
        out.push(assertObjectFields('team.coach', ctx, 'repo', repo.value[0], UI_FIELD_INVENTORY.coach, 'repo Coach'));
        out.push(assertObjectFields('team.coach', ctx, 'ui', repo.value[0], UI_FIELD_INVENTORY.coach, 'UI Coach'));
        if (!repo.value[0].firstName && !repo.value[0].lastName) {
          out.push(result('team.coach', ctx, 'repo', 'semantic_mismatch', 'coach missing name'));
        }
      } else {
        out.push(result('team.coach', ctx, 'repo', currentMayBeEmpty(ctx), 'getCoaches empty'));
      }
      return out;
    },
  },
  {
    id: 'coach.season_refs',
    area: 'coach',
    wrapper: 'espnCfbSeasonCoaches',
    seasons: ['prior'],
    run: async (ctx) => {
      const fetched = await safe('coach.season_refs', ctx, 'shape', 'espnCfbSeasonCoaches', () =>
        cfbRequest<{ items?: unknown[] }>(
          `contract:seasonCoaches:${ctx.season}`,
          (cfb) => cfb.espnCfbSeasonCoaches({ season: ctx.season, limit: 500 })
        )
      );
      if (fetched.error) return [fetched.error];
      const items = fetched.value?.items;
      return [
        Array.isArray(items) && items.length
          ? result('coach.season_refs', ctx, 'shape', 'ok', `season coaches=${items.length}`)
          : result('coach.season_refs', ctx, 'shape', 'missing_field', 'season coaches empty'),
      ];
    },
  },
  {
    id: 'news.league',
    area: 'news',
    wrapper: 'NewsRepo.getNews',
    seasons: ['current'],
    run: async (ctx) => {
      const fetched = await safe('news.league', ctx, 'repo', 'NewsRepo.getNews', () => newsRepo.getNews(5));
      if (fetched.error) return [fetched.error];
      if (!fetched.value?.length) {
        return [result('news.league', ctx, 'repo', 'expected_empty', 'league news empty')];
      }
      return [
        assertObjectFields('news.league', ctx, 'repo', fetched.value[0], UI_FIELD_INVENTORY.newsArticle, 'repo NewsArticle'),
        assertObjectFields('news.league', ctx, 'ui', fetched.value[0], UI_FIELD_INVENTORY.newsArticle, 'UI NewsArticle'),
      ];
    },
  },
  {
    id: 'news.team',
    area: 'news',
    wrapper: 'NewsRepo.getTeamNews',
    seasons: ['current'],
    run: async (ctx) => {
      const fetched = await safe('news.team', ctx, 'repo', 'NewsRepo.getTeamNews', () =>
        newsRepo.getTeamNews(ctx.teamId, 5)
      );
      if (fetched.error) return [fetched.error];
      if (!fetched.value?.length) {
        return [result('news.team', ctx, 'repo', 'expected_empty', 'team news empty (known preseason gap)')];
      }
      return [
        assertObjectFields('news.team', ctx, 'repo', fetched.value[0], UI_FIELD_INVENTORY.newsArticle, 'repo Team NewsArticle'),
        assertObjectFields('news.team', ctx, 'ui', fetched.value[0], UI_FIELD_INVENTORY.newsArticle, 'UI Team NewsArticle'),
      ];
    },
  },
  {
    id: 'leaders.season',
    area: 'leaders',
    wrapper: 'LeadersRepo.getSeasonLeaders',
    run: async (ctx) => {
      const fetched = await safe('leaders.season', ctx, 'repo', 'LeadersRepo.getSeasonLeaders', () =>
        leadersRepo.getSeasonLeaders(ctx.season)
      );
      if (fetched.error) {
        return ctx.seasonKind === 'current'
          ? [result('leaders.season', ctx, 'repo', 'expected_empty', fetched.error.message)]
          : [fetched.error];
      }
      const payload = fetched.value;
      if (!payload?.leaders?.length) {
        return [
          result(
            'leaders.season',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'repo leaders empty'
          ),
        ];
      }
      const out = [
        assertObjectFields('leaders.season', ctx, 'repo', payload.leaders[0], UI_FIELD_INVENTORY.leaderEntry, 'repo LeaderEntry'),
        assertObjectFields('leaders.season', ctx, 'ui', payload.leaders[0], UI_FIELD_INVENTORY.leaderEntry, 'UI LeaderEntry'),
      ];
      if (ctx.seasonKind === 'current' && payload.season !== ctx.season) {
        out.push(result('leaders.season', ctx, 'repo', 'expected_empty', `leaders fell back to season ${payload.season}`));
      } else if (ctx.seasonKind === 'prior' && payload.season !== ctx.season && payload.season !== ctx.season - 1) {
        out.push(result('leaders.season', ctx, 'repo', 'semantic_mismatch', `leaders season ${payload.season} unexpected`));
      } else {
        out.push(result('leaders.season', ctx, 'repo', 'ok', `leaders season=${payload.season}`));
      }
      return out;
    },
  },
  {
    id: 'depth.chart',
    area: 'depth',
    wrapper: 'DepthChartRepo.getDepthChart',
    run: async (ctx) => {
      const fetched = await safe('depth.chart', ctx, 'repo', 'DepthChartRepo.getDepthChart', () =>
        depthRepo.getDepthChart(ctx.teamId, ctx.season)
      );
      if (fetched.error) return [fetched.error];
      const chart = fetched.value;
      if (!chart) return [result('depth.chart', ctx, 'repo', currentMayBeEmpty(ctx), 'depth chart empty')];
      const out = [
        assertObjectFields('depth.chart', ctx, 'repo', chart, UI_FIELD_INVENTORY.depthChart, 'DepthChart'),
        assertObjectFields('depth.chart', ctx, 'ui', chart, UI_FIELD_INVENTORY.depthChart, 'UI DepthChart'),
      ];
      out.push(
        chart.available
          ? result('depth.chart', ctx, 'repo', 'ok', `players=${chart.players.length}`)
          : result('depth.chart', ctx, 'repo', 'expected_empty', 'depth available=false')
      );
      return out;
    },
  },
  {
    id: 'raw.vs_wrapper.scoreboard',
    area: 'raw',
    wrapper: 'espnCfbScoreboard vs GamesRepo',
    seasons: ['prior'],
    run: async (ctx) => {
      const direct = await safe('raw.vs_wrapper.scoreboard', ctx, 'raw', 'espnCfbScoreboard', () =>
        cfbRequest<SdvParsedScoreboardRow[]>(
          `contract:scoreboard:compare:${ctx.season}:5`,
          (cfb) =>
            cfb.espnCfbScoreboard({
              dates: ctx.season,
              week: 5,
              season_type: REGULAR_SEASON_TYPE,
              groups: FBS_GROUP,
              limit: 300,
              parsed: true,
            })
        )
      );
      if (direct.error) return [direct.error];
      const rows = Array.isArray(direct.value) ? direct.value : [];
      if (!rows.length) {
        return [result('raw.vs_wrapper.scoreboard', ctx, 'raw', 'expected_empty', 'direct scoreboard empty week 5')];
      }
      const mapped = rows.map((row) => mapParsedScoreboardRow(row, 5));
      const repo = await safe('raw.vs_wrapper.scoreboard', ctx, 'repo', 'GamesRepo.getWeekGamesFromScoreboard', () =>
        gamesRepo.getWeekGamesFromScoreboard(ctx.season, 5)
      );
      if (repo.error) return [repo.error];
      const repoRows = repo.value ?? [];
      return [
        mapped.length === repoRows.length
          ? result('raw.vs_wrapper.scoreboard', ctx, 'repo', 'ok', `direct and repo both ${mapped.length} rows`)
          : result('raw.vs_wrapper.scoreboard', ctx, 'repo', 'semantic_mismatch', `direct rows=${mapped.length} repo rows=${repoRows.length}`),
      ];
    },
  },
];

export function entriesForSeason(seasonKind: SeasonKind): CatalogEntry[] {
  return CATALOG.filter((entry) => {
    const seasons = entry.seasons ?? (['current', 'prior'] as SeasonKind[]);
    return seasons.includes(seasonKind);
  });
}
