/**
 * On-demand ESPN contract suite.
 *
 * Not wired into CI — hits live ESPN/SportsDataverse.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCfb, getDefaultSeason, sdvRequest } from '../espn-client';
import type { SdvParsedTeamScheduleRow } from '../espn-types';
import { entriesForSeason } from './catalog';
import { printReport, summarize, writeJsonReport } from './report';
import type { CheckResult, ContractContext, SeasonKind } from './types';
import { isFailure } from './types';

const FIXTURE_TEAM_ID = 61;
const FIXTURE_TEAM_SCHOOL = 'Georgia';

async function buildContext(seasonKind: SeasonKind): Promise<ContractContext> {
  const currentSeason = getDefaultSeason();
  const priorSeason = currentSeason - 1;
  const season = seasonKind === 'current' ? currentSeason : priorSeason;

  let gameIdCache: number | null | undefined;

  const ctx: ContractContext = {
    currentSeason,
    priorSeason,
    season,
    seasonKind,
    teamId: FIXTURE_TEAM_ID,
    teamSchool: FIXTURE_TEAM_SCHOOL,
    gameId: null,
    resolveGameId: async () => {
      if (gameIdCache !== undefined) return gameIdCache;
      try {
        const rows = await sdvRequest(async () => {
          const cfb = await getCfb();
          return (await cfb.espnCfbTeamSchedule({
            team_id: String(FIXTURE_TEAM_ID),
            season,
            parsed: true,
          })) as SdvParsedTeamScheduleRow[];
        }, {
          cacheKey: `contract:resolveGame:${FIXTURE_TEAM_ID}:${season}`,
        });
        const withId = rows.find((row) => row.id != null);
        gameIdCache = withId?.id != null ? Number(withId.id) : null;
      } catch {
        gameIdCache = null;
      }
      ctx.gameId = gameIdCache;
      return gameIdCache;
    },
  };
  return ctx;
}

describe('ESPN contract suite (live)', { timeout: 600_000 }, () => {
  it('checks live shapes, owner mappers, repos, and UI fields', async () => {
    const all: CheckResult[] = [];

    for (const seasonKind of ['current', 'prior'] as SeasonKind[]) {
      const ctx = await buildContext(seasonKind);
      console.log(
        `\n--- Season ${ctx.season} (${seasonKind}) team=${ctx.teamSchool}(${ctx.teamId}) ---`
      );
      for (const entry of entriesForSeason(seasonKind)) {
        try {
          all.push(...(await entry.run(ctx)));
        } catch (err) {
          all.push({
            entryId: entry.id,
            layer: 'shape',
            season: ctx.season,
            seasonKind,
            status: 'error',
            message: `uncaught: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    printReport(all);
    writeJsonReport(all);

    const summary = summarize(all);
    assert.equal(
      summary.failures.length,
      0,
      `${summary.failures.length} unexplained failure(s):\n` +
        summary.failures
          .map((failure) =>
            `  [${failure.status}] ${failure.entryId} @${failure.season}/${failure.layer}: ${failure.message}`
          )
          .join('\n')
    );
  });
});

// Re-export for tooling.
export { isFailure };
