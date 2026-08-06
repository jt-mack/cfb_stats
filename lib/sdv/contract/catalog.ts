import type { CatalogEntry, CheckLayer, CheckResult, CheckStatus, ContractContext, SeasonKind } from './types';
import { isEmptyPayload, missingPaths, requireKeys } from './paths';
import { UI_FIELD_INVENTORY } from './ui-fields';
import {
  FBS_GROUP,
  REGULAR_SEASON_TYPE,
  fetchParsedScoreboard,
  fetchParsedTeamSchedule,
  fetchTeamScheduleRaw,
  fetchParsedStandings,
  fetchRawStandings,
  fetchSeasonPowerIndex,
  fetchSeasonInfo,
  fetchParsedRankings,
  fetchSeasonWeeks,
  fetchGameSummaryRaw,
  fetchGameSummary,
  fetchGamePicks,
  fetchGameDrives,
  fetchGamePlays,
  fetchTeam,
  fetchParsedTeamRoster,
  fetchSeasonCoachRefs,
  fetchCoach,
  fetchCoachRecord,
  fetchTeamCoachEntry,
  fetchNews,
  fetchTeamNews,
  fetchSeasonTypeLeaders,
  fetchTeamDepthcharts,
  mapParsedScoreboardRow,
  mapParsedTeamScheduleRow,
  mapParsedStandingsToRecord,
  mapParsedRosterRows,
  mapEspnTeamToTeam,
  mapSeasonCoachEntry,
  mapSummaryToGameDetail,
  parsePollWeek,
  parsePowerIndexRow,
  normalizeRankingsPayload,
  getCfb,
} from '../index';
import { GamesRepo } from '../../../repos/games-repo';
import { TeamsRepo } from '../../../repos/teams-repo';
import { RankingsRepo } from '../../../repos/rankings-repo';
import { NewsRepo } from '../../../repos/news-repo';
import { LeadersRepo } from '../../../repos/leaders-repo';
import { DepthChartRepo } from '../../../repos/depth-chart-repo';
import { ConferencesRepo } from '../../../repos/conferences-repo';
import { ScoreboardRepo } from '../../../repos/scoreboard-repo';
import { FbsRepo } from '../../../repos/fbs-repo';
import { buildSeasonContext } from '../../season-context';

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
  if (missing.length) {
    return result(entryId, ctx, layer, 'missing_field', `${label} missing: ${missing.join(', ')}`, missing);
  }
  return result(entryId, ctx, layer, 'ok', `${label} fields present`);
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

/** Current-season leaders often 404 in preseason — expect empty/error. */
function leadersMayBeEmpty(ctx: ContractContext): boolean {
  return ctx.seasonKind === 'current';
}

/** Depth charts often header-only in preseason. */
function depthMayBeEmpty(ctx: ContractContext): boolean {
  return ctx.seasonKind === 'current';
}

/** Team news frequently empty; league news is current-only (not historical). */
function teamNewsMayBeEmpty(_ctx: ContractContext): boolean {
  return true;
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
  // -------------------------------------------------------------------------
  // Scoreboard & schedule
  // -------------------------------------------------------------------------
  {
    id: 'scoreboard.parsed',
    area: 'scoreboard',
    wrapper: 'fetchParsedScoreboard',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: rows, error } = await safe('scoreboard.parsed', ctx, 'shape', 'fetchParsedScoreboard', () =>
        fetchParsedScoreboard({ season: ctx.season, week: 1, seasontype: REGULAR_SEASON_TYPE, groups: FBS_GROUP })
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        // Week 1 may be empty early; try without week for season dump
        const retry = await safe('scoreboard.parsed', ctx, 'shape', 'fetchParsedScoreboard(no week)', () =>
          fetchParsedScoreboard({ season: ctx.season, seasontype: REGULAR_SEASON_TYPE, groups: FBS_GROUP, limit: 50 })
        );
        if (retry.error) return [retry.error];
        if (!Array.isArray(retry.value) || retry.value.length === 0) {
          out.push(
            result(
              'scoreboard.parsed',
              ctx,
              'shape',
              ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
              'scoreboard returned no rows'
            )
          );
          return out;
        }
        const row = retry.value[0];
        const missing = missingPaths(row, ['game_id', 'home_id', 'away_id', 'date']);
        out.push(
          missing.length
            ? result('scoreboard.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
            : result('scoreboard.parsed', ctx, 'shape', 'ok', `scoreboard rows=${retry.value.length}`)
        );
        try {
          const game = mapParsedScoreboardRow(row, 1);
          out.push(assertObjectFields('scoreboard.parsed', ctx, 'mapper', game, UI_FIELD_INVENTORY.game, 'mapped Game'));
          if (!game.homeTeam || !game.awayTeam) {
            out.push(result('scoreboard.parsed', ctx, 'mapper', 'semantic_mismatch', 'mapped Game missing team names'));
          }
        } catch (err) {
          out.push(
            result('scoreboard.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err))
          );
        }
        return out;
      }
      const row = rows[0];
      const missing = missingPaths(row, ['game_id', 'home_id', 'away_id', 'date']);
      out.push(
        missing.length
          ? result('scoreboard.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
          : result('scoreboard.parsed', ctx, 'shape', 'ok', `scoreboard week1 rows=${rows.length}`)
      );
      try {
        const game = mapParsedScoreboardRow(row, 1);
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'mapper', game, UI_FIELD_INVENTORY.game, 'mapped Game'));
      } catch (err) {
        out.push(
          result('scoreboard.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err))
        );
      }
      const { value: weekGames, error: repoErr } = await safe('scoreboard.parsed', ctx, 'repo', 'getWeekGamesFromScoreboard', () =>
        gamesRepo.getWeekGamesFromScoreboard(ctx.season, 1)
      );
      if (repoErr) out.push(repoErr);
      else if (weekGames?.length) {
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'repo', weekGames[0], UI_FIELD_INVENTORY.game, 'repo Game'));
        out.push(assertObjectFields('scoreboard.parsed', ctx, 'ui', weekGames[0], UI_FIELD_INVENTORY.game, 'UI Game'));
      } else {
        out.push(
          result(
            'scoreboard.parsed',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'repo week games empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'schedule.parsed',
    area: 'schedule',
    wrapper: 'fetchParsedTeamSchedule',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: rows, error } = await safe('schedule.parsed', ctx, 'shape', 'fetchParsedTeamSchedule', () =>
        fetchParsedTeamSchedule({ teamId: ctx.teamId, season: ctx.season })
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'schedule.parsed',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'team schedule empty'
          ),
        ];
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
        if (game.season !== ctx.season && game.season !== 0) {
          out.push(
            result(
              'schedule.parsed',
              ctx,
              'mapper',
              'semantic_mismatch',
              `mapped season ${game.season} != requested ${ctx.season}`
            )
          );
        } else {
          out.push(result('schedule.parsed', ctx, 'mapper', 'ok', `season matches ${ctx.season}`));
        }
      } catch (err) {
        out.push(
          result('schedule.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err))
        );
      }
      const { value: schedule, error: repoErr } = await safe('schedule.parsed', ctx, 'repo', 'getSchedule', () =>
        gamesRepo.getSchedule(ctx.teamSchool, ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (schedule?.length) {
        out.push(assertObjectFields('schedule.parsed', ctx, 'repo', schedule[0], UI_FIELD_INVENTORY.game, 'repo schedule'));
        out.push(assertObjectFields('schedule.parsed', ctx, 'ui', schedule[0], UI_FIELD_INVENTORY.game, 'UI schedule'));
      } else {
        out.push(
          result(
            'schedule.parsed',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'repo schedule empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'schedule.raw',
    area: 'schedule',
    wrapper: 'fetchTeamScheduleRaw',
    run: async (ctx) => {
      const { value: raw, error } = await safe('schedule.raw', ctx, 'shape', 'fetchTeamScheduleRaw', () =>
        fetchTeamScheduleRaw({ teamId: ctx.teamId, season: ctx.season })
      );
      if (error) return [error];
      if (!raw?.events?.length) {
        return [
          result(
            'schedule.raw',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'raw schedule events empty'
          ),
        ];
      }
      return [result('schedule.raw', ctx, 'shape', 'ok', `raw events=${raw.events.length}`)];
    },
  },

  // -------------------------------------------------------------------------
  // Standings
  // -------------------------------------------------------------------------
  {
    id: 'standings.parsed',
    area: 'standings',
    wrapper: 'fetchParsedStandings',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: rows, error } = await safe('standings.parsed', ctx, 'shape', 'fetchParsedStandings', () =>
        fetchParsedStandings(ctx.season, FBS_GROUP)
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'standings.parsed',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'parsed standings empty'
          ),
        ];
      }
      const row = rows.find((r) => Number(r.team_id) === ctx.teamId) ?? rows[0];
      const missing = missingPaths(row, ['team_id', 'team_location']);
      out.push(
        missing.length
          ? result('standings.parsed', ctx, 'shape', 'missing_field', `row missing ${missing.join(',')}`, missing)
          : result('standings.parsed', ctx, 'shape', 'ok', `standings rows=${rows.length}`)
      );
      const rec = mapParsedStandingsToRecord(row, ctx.season, String(row.group_abbreviation ?? 'SEC'));
      out.push(
        assertObjectFields('standings.parsed', ctx, 'mapper', rec, UI_FIELD_INVENTORY.teamRecords, 'mapped TeamRecords')
      );
      // Semantic: do not invent W-L from bare wins (covered by unit tests); if overall present, parse it
      if (row.overall && typeof row.overall === 'string' && row.overall.includes('-')) {
        if (rec.total.wins === 0 && rec.total.losses === 0 && !row.overall.startsWith('0-0')) {
          out.push(
            result(
              'standings.parsed',
              ctx,
              'mapper',
              'semantic_mismatch',
              `overall "${row.overall}" did not map to W-L`
            )
          );
        } else {
          out.push(result('standings.parsed', ctx, 'mapper', 'ok', `overall "${row.overall}" → ${rec.total.wins}-${rec.total.losses}`));
        }
      }
      const { value: fbs, error: repoErr } = await safe('standings.parsed', ctx, 'repo', 'getFbsRecords', () =>
        conferencesRepo.getFbsRecords(ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (fbs?.length) {
        out.push(assertObjectFields('standings.parsed', ctx, 'repo', fbs[0], UI_FIELD_INVENTORY.teamRecords, 'repo TeamRecords'));
        out.push(assertObjectFields('standings.parsed', ctx, 'ui', fbs[0], UI_FIELD_INVENTORY.teamRecords, 'UI TeamRecords'));
        out.push(assertObjectFields('standings.parsed', ctx, 'ui', fbs[0].total, UI_FIELD_INVENTORY.teamRecord, 'UI TeamRecord.total'));
      } else {
        out.push(
          result(
            'standings.parsed',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'fbs records empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'standings.raw',
    area: 'standings',
    wrapper: 'fetchRawStandings',
    run: async (ctx) => {
      const { value: raw, error } = await safe('standings.raw', ctx, 'shape', 'fetchRawStandings', () =>
        fetchRawStandings(ctx.season, FBS_GROUP)
      );
      if (error) return [error];
      if (isEmptyPayload(raw)) {
        return [
          result(
            'standings.raw',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'raw standings empty'
          ),
        ];
      }
      const hasEntries =
        Array.isArray(raw?.standings?.entries) ||
        (Array.isArray(raw?.children) && (raw.children as unknown[]).length > 0);
      return [
        hasEntries
          ? result('standings.raw', ctx, 'shape', 'ok', 'raw standings has entries/children')
          : result('standings.raw', ctx, 'shape', 'missing_field', 'raw standings missing entries/children'),
      ];
    },
  },

  // -------------------------------------------------------------------------
  // Rankings & power index
  // -------------------------------------------------------------------------
  {
    id: 'rankings.parsed',
    area: 'rankings',
    wrapper: 'fetchParsedRankings',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: raw, error } = await safe('rankings.parsed', ctx, 'shape', 'fetchParsedRankings', () =>
        fetchParsedRankings(ctx.season)
      );
      if (error) return [error];
      const normalized = normalizeRankingsPayload(raw);
      const rankings = (normalized.rankings as unknown[]) ?? [];
      if (!rankings.length) {
        return [
          result(
            'rankings.parsed',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'rankings empty'
          ),
        ];
      }
      out.push(result('rankings.parsed', ctx, 'shape', 'ok', `rankings polls=${rankings.length}`));
      const pollWeek = parsePollWeek(normalized);
      out.push(assertObjectFields('rankings.parsed', ctx, 'mapper', pollWeek, UI_FIELD_INVENTORY.pollWeek, 'PollWeek'));
      if (pollWeek.polls[0]) {
        out.push(assertObjectFields('rankings.parsed', ctx, 'mapper', pollWeek.polls[0], UI_FIELD_INVENTORY.poll, 'Poll'));
        if (pollWeek.polls[0].ranks[0]) {
          out.push(
            assertObjectFields(
              'rankings.parsed',
              ctx,
              'mapper',
              pollWeek.polls[0].ranks[0],
              UI_FIELD_INVENTORY.pollRank,
              'PollRank'
            )
          );
        }
      }
      // Semantic: historical CDN should reflect requested year; live may show prior final during preseason
      if (ctx.seasonKind === 'prior' && pollWeek.season && pollWeek.season !== ctx.season) {
        out.push(
          result(
            'rankings.parsed',
            ctx,
            'mapper',
            'semantic_mismatch',
            `PollWeek.season ${pollWeek.season} != requested prior ${ctx.season}`
          )
        );
      } else if (ctx.seasonKind === 'current' && pollWeek.season && pollWeek.season !== ctx.season) {
        out.push(
          result(
            'rankings.parsed',
            ctx,
            'mapper',
            'expected_empty',
            `live rankings season ${pollWeek.season} (may be prior final during preseason)`
          )
        );
      } else {
        out.push(result('rankings.parsed', ctx, 'mapper', 'ok', `PollWeek.season=${pollWeek.season}`));
      }
      const { value: repoWeek, error: repoErr } = await safe('rankings.parsed', ctx, 'repo', 'getRankings', () =>
        rankingsRepo.getRankings(ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (repoWeek) {
        out.push(assertObjectFields('rankings.parsed', ctx, 'repo', repoWeek, UI_FIELD_INVENTORY.pollWeek, 'repo PollWeek'));
        out.push(assertObjectFields('rankings.parsed', ctx, 'ui', repoWeek, UI_FIELD_INVENTORY.pollWeek, 'UI PollWeek'));
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
      const { value: rows, error } = await safe('powerindex.parsed', ctx, 'shape', 'fetchSeasonPowerIndex', () =>
        fetchSeasonPowerIndex(ctx.season)
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'powerindex.parsed',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'power index empty'
          ),
        ];
      }
      out.push(result('powerindex.parsed', ctx, 'shape', 'ok', `powerindex rows=${rows.length}`));
      try {
        const parsed = parsePowerIndexRow(rows[0]);
        if (!parsed?.teamId) {
          out.push(result('powerindex.parsed', ctx, 'mapper', 'semantic_mismatch', 'power index row missing teamId'));
        } else {
          out.push(result('powerindex.parsed', ctx, 'mapper', 'ok', `teamId=${parsed.teamId}`));
        }
      } catch (err) {
        out.push(
          result('powerindex.parsed', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err))
        );
      }
      const { value: fpi, error: repoErr } = await safe('powerindex.parsed', ctx, 'repo', 'getFpiRankings', () =>
        fbsRepo.getFpiRankings(ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (fpi && fpi.size > 0) {
        out.push(result('powerindex.parsed', ctx, 'repo', 'ok', `fpi rankings size=${fpi.size}`));
      } else {
        out.push(
          result(
            'powerindex.parsed',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'fpi rankings empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'season.info',
    area: 'calendar',
    wrapper: 'fetchSeasonInfo / buildSeasonContext',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: info, error } = await safe('season.info', ctx, 'shape', 'fetchSeasonInfo', () =>
        fetchSeasonInfo(ctx.season)
      );
      if (error) return [error];
      const missing = missingPaths(info, ['year', 'startDate', 'endDate', 'type', 'types']);
      out.push(
        missing.length
          ? result('season.info', ctx, 'shape', 'missing_field', `season info missing ${missing.join(',')}`, missing)
          : result('season.info', ctx, 'shape', 'ok', `season ${info?.year} type=${info?.type?.name}`)
      );
      if (Number(info?.year) !== ctx.season) {
        out.push(
          result(
            'season.info',
            ctx,
            'mapper',
            'semantic_mismatch',
            `year ${info?.year} != requested ${ctx.season}`
          )
        );
      }
      const items = info?.types?.items ?? [];
      if (!items.length) {
        out.push(result('season.info', ctx, 'shape', 'missing_field', 'types.items empty'));
      } else {
        out.push(result('season.info', ctx, 'shape', 'ok', `type windows=${items.length}`));
      }
      const { value: seasonCtx, error: repoErr } = await safe('season.info', ctx, 'repo', 'buildSeasonContext', () =>
        buildSeasonContext(ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (seasonCtx) {
        const keys = [
          'year',
          'phase',
          'startDate',
          'endDate',
          'isActive',
          'seasonStarted',
          'firstGameDate',
        ] as const;
        out.push(assertObjectFields('season.info', ctx, 'repo', seasonCtx, keys, 'SeasonContext'));
        out.push(assertObjectFields('season.info', ctx, 'ui', seasonCtx, keys, 'UI SeasonContext'));
        if (ctx.seasonKind === 'prior' && seasonCtx.isActive) {
          out.push(
            result('season.info', ctx, 'repo', 'semantic_mismatch', 'prior season should not be isActive')
          );
        }
        if (ctx.seasonKind === 'prior' && seasonCtx.phase !== 'offseason') {
          out.push(
            result(
              'season.info',
              ctx,
              'repo',
              'semantic_mismatch',
              `prior season phase=${seasonCtx.phase}, expected offseason`
            )
          );
        }
        if (seasonCtx.year !== ctx.season) {
          out.push(
            result('season.info', ctx, 'repo', 'semantic_mismatch', `context year ${seasonCtx.year}`)
          );
        }
      }
      return out;
    },
  },
  {
    id: 'season.weeks',
    area: 'calendar',
    wrapper: 'fetchSeasonWeeks',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: weeks, error } = await safe('season.weeks', ctx, 'shape', 'fetchSeasonWeeks', () =>
        fetchSeasonWeeks(ctx.season, REGULAR_SEASON_TYPE)
      );
      if (error) return [error];
      if (!weeks?.length) {
        return [
          result(
            'season.weeks',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'season weeks empty'
          ),
        ];
      }
      out.push(result('season.weeks', ctx, 'shape', 'ok', `weeks=${weeks.length}`));
      out.push(
        assertObjectFields('season.weeks', ctx, 'mapper', weeks[0], ['week', 'startDate', 'endDate', 'seasonType'], 'SeasonWeekInfo')
      );
      const { value: cal, error: repoErr } = await safe('season.weeks', ctx, 'repo', 'getCalendar', () =>
        scoreboardRepo.getCalendar(ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (cal?.length) {
        out.push(assertObjectFields('season.weeks', ctx, 'repo', cal[0], UI_FIELD_INVENTORY.calendarWeek, 'CalendarWeek'));
        out.push(assertObjectFields('season.weeks', ctx, 'ui', cal[0], UI_FIELD_INVENTORY.calendarWeek, 'UI CalendarWeek'));
      }
      return out;
    },
  },

  // -------------------------------------------------------------------------
  // Game detail
  // -------------------------------------------------------------------------
  {
    id: 'game.summary',
    area: 'game',
    wrapper: 'fetchGameSummaryRaw / fetchGameSummary',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) {
        return [
          result(
            'game.summary',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'no gameId from schedule'
          ),
        ];
      }
      const out: CheckResult[] = [];
      const { value: raw, error } = await safe('game.summary', ctx, 'shape', 'fetchGameSummaryRaw', () =>
        fetchGameSummaryRaw(gameId)
      );
      if (error) return [error];
      if (!raw?.header) {
        out.push(result('game.summary', ctx, 'shape', 'missing_field', 'summary missing header'));
      } else {
        out.push(result('game.summary', ctx, 'shape', 'ok', `summary gameId=${gameId}`));
      }
      try {
        const summary = await fetchGameSummary(gameId);
        const detail = mapSummaryToGameDetail(summary);
        out.push(assertObjectFields('game.summary', ctx, 'mapper', detail, UI_FIELD_INVENTORY.gameDetail, 'GameDetail'));
        if (detail.game) {
          out.push(assertObjectFields('game.summary', ctx, 'mapper', detail.game, UI_FIELD_INVENTORY.game, 'GameDetail.game'));
        }
      } catch (err) {
        out.push(result('game.summary', ctx, 'mapper', 'map_error', err instanceof Error ? err.message : String(err)));
      }
      const { value: detail, error: repoErr } = await safe('game.summary', ctx, 'repo', 'getGameDetail', () =>
        gamesRepo.getGameDetail(gameId)
      );
      if (repoErr) out.push(repoErr);
      else if (detail) {
        out.push(assertObjectFields('game.summary', ctx, 'repo', detail, UI_FIELD_INVENTORY.gameDetail, 'repo GameDetail'));
        out.push(assertObjectFields('game.summary', ctx, 'ui', detail, UI_FIELD_INVENTORY.gameDetail, 'UI GameDetail'));
      }
      return out;
    },
  },
  {
    id: 'game.picks',
    area: 'game',
    wrapper: 'fetchGamePicks',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) {
        return [result('game.picks', ctx, 'shape', 'expected_empty', 'no gameId')];
      }
      const { value: picks, error } = await safe('game.picks', ctx, 'shape', 'fetchGamePicks', () =>
        fetchGamePicks(gameId)
      );
      if (error) return [error];
      if (!picks?.header && !picks?.pickcenter) {
        return [result('game.picks', ctx, 'shape', 'expected_empty', 'picks/header empty (ok for some games)')];
      }
      return [result('game.picks', ctx, 'shape', 'ok', `picks id=${picks.id}`)];
    },
  },
  {
    id: 'game.drives_plays',
    area: 'game',
    wrapper: 'fetchGameDrives / fetchGamePlays',
    run: async (ctx) => {
      const gameId = await ctx.resolveGameId();
      if (!gameId) {
        return [result('game.drives_plays', ctx, 'shape', 'expected_empty', 'no gameId')];
      }
      const out: CheckResult[] = [];
      const drives = await safe('game.drives_plays', ctx, 'shape', 'fetchGameDrives', () => fetchGameDrives(gameId));
      if (drives.error) out.push(drives.error);
      else if (!drives.value?.length) {
        out.push(
          result(
            'game.drives_plays',
            ctx,
            'shape',
            'expected_empty',
            'drives empty (pregame / not final)'
          )
        );
      } else {
        out.push(result('game.drives_plays', ctx, 'shape', 'ok', `drives=${drives.value.length}`));
      }
      const plays = await safe('game.drives_plays', ctx, 'shape', 'fetchGamePlays', () => fetchGamePlays(gameId));
      if (plays.error) out.push(plays.error);
      else if (!plays.value?.length) {
        out.push(result('game.drives_plays', ctx, 'shape', 'expected_empty', 'plays empty'));
      } else {
        out.push(result('game.drives_plays', ctx, 'shape', 'ok', `plays=${plays.value.length}`));
      }
      return out;
    },
  },

  // -------------------------------------------------------------------------
  // Team / roster / coach
  // -------------------------------------------------------------------------
  {
    id: 'team.info',
    area: 'team',
    wrapper: 'fetchTeam',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: raw, error } = await safe('team.info', ctx, 'shape', 'fetchTeam', () => fetchTeam(ctx.teamId));
      if (error) return [error];
      if (!raw?.team) {
        return [result('team.info', ctx, 'shape', 'missing_field', 'team response missing team')];
      }
      out.push(result('team.info', ctx, 'shape', 'ok', `team ${raw.team.displayName ?? raw.team.location}`));
      const mapped = mapEspnTeamToTeam(raw.team);
      out.push(assertObjectFields('team.info', ctx, 'mapper', mapped, UI_FIELD_INVENTORY.team, 'mapped Team'));
      if (mapped.id !== ctx.teamId) {
        out.push(
          result('team.info', ctx, 'mapper', 'semantic_mismatch', `mapped id ${mapped.id} != ${ctx.teamId}`)
        );
      }
      const { value: info, error: repoErr } = await safe('team.info', ctx, 'repo', 'getTeamInfo', () =>
        teamsRepo.getTeamInfo(String(ctx.teamId), ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (info) {
        out.push(assertObjectFields('team.info', ctx, 'repo', info, UI_FIELD_INVENTORY.team, 'repo Team'));
        out.push(assertObjectFields('team.info', ctx, 'ui', info, UI_FIELD_INVENTORY.team, 'UI Team'));
      } else {
        out.push(result('team.info', ctx, 'repo', 'missing_field', 'getTeamInfo returned null'));
      }
      return out;
    },
  },
  {
    id: 'team.roster',
    area: 'team',
    wrapper: 'fetchParsedTeamRoster',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: rows, error } = await safe('team.roster', ctx, 'shape', 'fetchParsedTeamRoster', () =>
        fetchParsedTeamRoster(ctx.teamId)
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'team.roster',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'roster empty'
          ),
        ];
      }
      out.push(result('team.roster', ctx, 'shape', 'ok', `roster rows=${rows.length}`));
      const mapped = mapParsedRosterRows(rows, ctx.teamSchool, ctx.season);
      if (!mapped.length) {
        out.push(result('team.roster', ctx, 'mapper', 'map_error', 'mapParsedRosterRows returned []'));
      } else {
        out.push(
          assertObjectFields('team.roster', ctx, 'mapper', mapped[0], UI_FIELD_INVENTORY.rosterPlayer, 'mapped RosterPlayer')
        );
      }
      const { value: roster, error: repoErr } = await safe('team.roster', ctx, 'repo', 'getRoster', () =>
        teamsRepo.getRoster(ctx.teamSchool, ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (roster?.length) {
        out.push(assertObjectFields('team.roster', ctx, 'repo', roster[0], UI_FIELD_INVENTORY.rosterPlayer, 'repo roster'));
        out.push(assertObjectFields('team.roster', ctx, 'ui', roster[0], UI_FIELD_INVENTORY.rosterPlayer, 'UI roster'));
      }
      return out;
    },
  },
  {
    id: 'team.coach',
    area: 'coach',
    wrapper: 'fetchTeamCoachEntry / fetchCoach / fetchCoachRecord',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: entry, error } = await safe('team.coach', ctx, 'shape', 'fetchTeamCoachEntry', () =>
        fetchTeamCoachEntry(ctx.teamId, ctx.season)
      );
      if (error) return [error];
      if (!entry) {
        return [
          result(
            'team.coach',
            ctx,
            'shape',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'coach entry null'
          ),
        ];
      }
      out.push(
        result(
          'team.coach',
          ctx,
          'shape',
          'ok',
          `coach ${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim()
        )
      );
      const mapped = mapSeasonCoachEntry(entry, ctx.teamSchool, ctx.season);
      if (mapped[0]) {
        out.push(assertObjectFields('team.coach', ctx, 'mapper', mapped[0], UI_FIELD_INVENTORY.coach, 'mapped Coach'));
      }
      if (entry.id) {
        const coach = await safe('team.coach', ctx, 'shape', 'fetchCoach', () => fetchCoach(entry.id!));
        if (coach.error) out.push(coach.error);
        else if (!coach.value?.length) {
          out.push(result('team.coach', ctx, 'shape', 'expected_empty', 'fetchCoach empty'));
        } else {
          const missing = missingPaths(coach.value[0], ['first_name', 'last_name']);
          out.push(
            missing.length
              ? result('team.coach', ctx, 'shape', 'missing_field', `coach row missing ${missing.join(',')}`)
              : result('team.coach', ctx, 'shape', 'ok', 'fetchCoach row ok')
          );
        }
        const record = await safe('team.coach', ctx, 'shape', 'fetchCoachRecord', () =>
          fetchCoachRecord(entry.id!)
        );
        if (record.error) out.push(record.error);
        else {
          out.push(
            result(
              'team.coach',
              ctx,
              'shape',
              Array.isArray(record.value) ? 'ok' : 'expected_empty',
              `coachRecord length=${Array.isArray(record.value) ? record.value.length : 0}`
            )
          );
        }
      }
      const { value: coaches, error: repoErr } = await safe('team.coach', ctx, 'repo', 'getCoaches', () =>
        teamsRepo.getCoaches(ctx.teamSchool, ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (coaches?.length) {
        out.push(assertObjectFields('team.coach', ctx, 'repo', coaches[0], UI_FIELD_INVENTORY.coach, 'repo Coach'));
        out.push(assertObjectFields('team.coach', ctx, 'ui', coaches[0], UI_FIELD_INVENTORY.coach, 'UI Coach'));
        if (!coaches[0].firstName && !coaches[0].lastName) {
          out.push(result('team.coach', ctx, 'repo', 'semantic_mismatch', 'coach missing name'));
        }
      } else {
        out.push(
          result(
            'team.coach',
            ctx,
            'repo',
            ctx.seasonKind === 'current' ? 'expected_empty' : 'missing_field',
            'getCoaches empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'coach.season_refs',
    area: 'coach',
    wrapper: 'fetchSeasonCoachRefs',
    seasons: ['prior'],
    run: async (ctx) => {
      const { value: list, error } = await safe('coach.season_refs', ctx, 'shape', 'fetchSeasonCoachRefs', () =>
        fetchSeasonCoachRefs(ctx.season)
      );
      if (error) return [error];
      const items = (list as { items?: unknown[] } | null)?.items;
      if (!Array.isArray(items) || items.length === 0) {
        return [result('coach.season_refs', ctx, 'shape', 'missing_field', 'season coaches empty')];
      }
      return [result('coach.season_refs', ctx, 'shape', 'ok', `season coaches=${items.length}`)];
    },
  },

  // -------------------------------------------------------------------------
  // News / leaders / depth
  // -------------------------------------------------------------------------
  {
    id: 'news.league',
    area: 'news',
    wrapper: 'fetchNews',
    seasons: ['current'],
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: rows, error } = await safe('news.league', ctx, 'shape', 'fetchNews', () => fetchNews(5));
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [result('news.league', ctx, 'shape', 'expected_empty', 'league news empty')];
      }
      const missing = missingPaths(rows[0], ['headline']);
      out.push(
        missing.length
          ? result('news.league', ctx, 'shape', 'missing_field', `news row missing ${missing.join(',')}`)
          : result('news.league', ctx, 'shape', 'ok', `news rows=${rows.length}`)
      );
      const { value: articles, error: repoErr } = await safe('news.league', ctx, 'repo', 'getNews', () =>
        newsRepo.getNews(5)
      );
      if (repoErr) out.push(repoErr);
      else if (articles?.length) {
        out.push(
          assertObjectFields('news.league', ctx, 'repo', articles[0], UI_FIELD_INVENTORY.newsArticle, 'repo NewsArticle')
        );
        out.push(
          assertObjectFields('news.league', ctx, 'ui', articles[0], UI_FIELD_INVENTORY.newsArticle, 'UI NewsArticle')
        );
      }
      return out;
    },
  },
  {
    id: 'news.team',
    area: 'news',
    wrapper: 'fetchTeamNews',
    seasons: ['current'],
    run: async (ctx) => {
      const { value: rows, error } = await safe('news.team', ctx, 'shape', 'fetchTeamNews', () =>
        fetchTeamNews(ctx.teamId, 5)
      );
      if (error) return [error];
      if (!Array.isArray(rows) || rows.length === 0) {
        return [
          result(
            'news.team',
            ctx,
            'shape',
            teamNewsMayBeEmpty(ctx) ? 'expected_empty' : 'missing_field',
            'team news empty (known preseason gap)'
          ),
        ];
      }
      return [result('news.team', ctx, 'shape', 'ok', `team news rows=${rows.length}`)];
    },
  },
  {
    id: 'leaders.season',
    area: 'leaders',
    wrapper: 'fetchSeasonTypeLeaders',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: payload, error } = await safe('leaders.season', ctx, 'shape', 'fetchSeasonTypeLeaders', () =>
        fetchSeasonTypeLeaders(ctx.season, REGULAR_SEASON_TYPE)
      );
      if (error) {
        if (leadersMayBeEmpty(ctx)) {
          return [
            result(
              'leaders.season',
              ctx,
              'shape',
              'expected_empty',
              `leaders unavailable in current season: ${error.message}`
            ),
          ];
        }
        return [error];
      }
      if (!payload?.categories?.length) {
        return [
          result(
            'leaders.season',
            ctx,
            'shape',
            leadersMayBeEmpty(ctx) ? 'expected_empty' : 'missing_field',
            'leaders categories empty'
          ),
        ];
      }
      out.push(result('leaders.season', ctx, 'shape', 'ok', `categories=${payload.categories.length}`));
      const first = payload.categories[0];
      if (!first.leaders?.length) {
        out.push(result('leaders.season', ctx, 'shape', 'missing_field', 'first category has no leaders'));
      } else {
        const leader = first.leaders[0];
        if (!leader.athlete?.['$ref'] && !leader.team?.['$ref']) {
          out.push(result('leaders.season', ctx, 'shape', 'missing_field', 'leader missing athlete/team $ref'));
        } else {
          out.push(result('leaders.season', ctx, 'shape', 'ok', 'leader refs present'));
        }
      }
      const { value: repoLeaders, error: repoErr } = await safe('leaders.season', ctx, 'repo', 'getSeasonLeaders', () =>
        leadersRepo.getSeasonLeaders(ctx.season)
      );
      if (repoErr) {
        if (leadersMayBeEmpty(ctx)) {
          out.push(result('leaders.season', ctx, 'repo', 'expected_empty', repoErr.message));
        } else {
          out.push(repoErr);
        }
      } else if (repoLeaders?.leaders?.length) {
        out.push(
          assertObjectFields(
            'leaders.season',
            ctx,
            'repo',
            repoLeaders.leaders[0],
            UI_FIELD_INVENTORY.leaderEntry,
            'repo LeaderEntry'
          )
        );
        out.push(
          assertObjectFields(
            'leaders.season',
            ctx,
            'ui',
            repoLeaders.leaders[0],
            UI_FIELD_INVENTORY.leaderEntry,
            'UI LeaderEntry'
          )
        );
        // Semantic: resolved season for current may fall back to prior
        if (ctx.seasonKind === 'current' && repoLeaders.season !== ctx.season) {
          out.push(
            result(
              'leaders.season',
              ctx,
              'repo',
              'expected_empty',
              `leaders fell back to season ${repoLeaders.season}`
            )
          );
        } else if (ctx.seasonKind === 'prior' && repoLeaders.season !== ctx.season && repoLeaders.season !== ctx.season - 1) {
          out.push(
            result(
              'leaders.season',
              ctx,
              'repo',
              'semantic_mismatch',
              `leaders season ${repoLeaders.season} unexpected for prior request ${ctx.season}`
            )
          );
        } else {
          out.push(result('leaders.season', ctx, 'repo', 'ok', `leaders season=${repoLeaders.season}`));
        }
      } else {
        out.push(
          result(
            'leaders.season',
            ctx,
            'repo',
            leadersMayBeEmpty(ctx) ? 'expected_empty' : 'missing_field',
            'repo leaders empty'
          )
        );
      }
      return out;
    },
  },
  {
    id: 'depth.chart',
    area: 'depth',
    wrapper: 'fetchTeamDepthcharts',
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: raw, error } = await safe('depth.chart', ctx, 'shape', 'fetchTeamDepthcharts', () =>
        fetchTeamDepthcharts(ctx.teamId)
      );
      if (error) return [error];
      if (isEmptyPayload(raw)) {
        return [
          result(
            'depth.chart',
            ctx,
            'shape',
            depthMayBeEmpty(ctx) ? 'expected_empty' : 'missing_field',
            'depth chart empty'
          ),
        ];
      }
      out.push(result('depth.chart', ctx, 'shape', 'ok', 'depth chart payload present'));
      const { value: chart, error: repoErr } = await safe('depth.chart', ctx, 'repo', 'getDepthChart', () =>
        depthRepo.getDepthChart(ctx.teamId, ctx.season)
      );
      if (repoErr) out.push(repoErr);
      else if (chart) {
        out.push(assertObjectFields('depth.chart', ctx, 'repo', chart, UI_FIELD_INVENTORY.depthChart, 'DepthChart'));
        out.push(assertObjectFields('depth.chart', ctx, 'ui', chart, UI_FIELD_INVENTORY.depthChart, 'UI DepthChart'));
        if (!chart.available) {
          out.push(
            result(
              'depth.chart',
              ctx,
              'repo',
              'expected_empty',
              'depth available=false (endpoint returns team header only; no athletes yet)'
            )
          );
        } else {
          out.push(result('depth.chart', ctx, 'repo', 'ok', `players=${chart.players.length}`));
        }
      }
      return out;
    },
  },

  // -------------------------------------------------------------------------
  // Raw SDV vs wrapper param spot-check (scoreboard)
  // -------------------------------------------------------------------------
  {
    id: 'raw.vs_wrapper.scoreboard',
    area: 'raw',
    wrapper: 'espnCfbScoreboard vs fetchParsedScoreboard',
    seasons: ['prior'],
    run: async (ctx) => {
      const out: CheckResult[] = [];
      const { value: wrapped, error: wErr } = await safe(
        'raw.vs_wrapper.scoreboard',
        ctx,
        'shape',
        'fetchParsedScoreboard',
        () =>
          fetchParsedScoreboard({
            season: ctx.season,
            week: 5,
            seasontype: REGULAR_SEASON_TYPE,
            groups: FBS_GROUP,
            limit: 20,
          })
      );
      if (wErr) return [wErr];
      const { value: raw, error: rErr } = await safe('raw.vs_wrapper.scoreboard', ctx, 'raw', 'espnCfbScoreboard', async () => {
        const cfb = await getCfb();
        return cfb.espnCfbScoreboard({
          dates: ctx.season,
          week: 5,
          season_type: REGULAR_SEASON_TYPE,
          groups: FBS_GROUP,
          limit: 20,
          parsed: true,
        });
      });
      if (rErr) return [rErr];
      const wLen = Array.isArray(wrapped) ? wrapped.length : 0;
      const rLen = Array.isArray(raw) ? raw.length : 0;
      if (wLen === 0 && rLen === 0) {
        return [result('raw.vs_wrapper.scoreboard', ctx, 'raw', 'expected_empty', 'both empty week 5')];
      }
      if (wLen !== rLen) {
        out.push(
          result(
            'raw.vs_wrapper.scoreboard',
            ctx,
            'raw',
            'semantic_mismatch',
            `wrapper rows=${wLen} raw rows=${rLen}`
          )
        );
      } else {
        out.push(result('raw.vs_wrapper.scoreboard', ctx, 'raw', 'ok', `wrapper and raw both ${wLen} rows`));
      }
      return out;
    },
  },
];

export function entriesForSeason(seasonKind: SeasonKind): CatalogEntry[] {
  return CATALOG.filter((e) => {
    const seasons = e.seasons ?? (['current', 'prior'] as SeasonKind[]);
    return seasons.includes(seasonKind);
  });
}
