/**
 * On-demand SDV contract suite.
 *
 * Run: yarn test:sdv-contract
 * Not wired into CI — hits live ESPN/SportsDataverse.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDefaultSeason, fetchParsedTeamSchedule } from '../index';
import { entriesForSeason } from './catalog';
import { printReport, writeJsonReport, summarize } from './report';
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
        const rows = await fetchParsedTeamSchedule({ teamId: FIXTURE_TEAM_ID, season });
        const withId = (rows ?? []).find((r) => r.id != null);
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

describe('SDV contract suite (live)', { timeout: 600_000 }, () => {
  it('checks all consumed wrappers for current + prior seasons', async () => {
    const all: CheckResult[] = [];

    for (const seasonKind of ['current', 'prior'] as SeasonKind[]) {
      const ctx = await buildContext(seasonKind);
      console.log(
        `\n--- Season ${ctx.season} (${seasonKind}) team=${ctx.teamSchool}(${ctx.teamId}) ---`
      );
      for (const entry of entriesForSeason(seasonKind)) {
        try {
          const results = await entry.run(ctx);
          all.push(...results);
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
        summary.failures.map((f) => `  [${f.status}] ${f.entryId} @${f.season}/${f.layer}: ${f.message}`).join('\n')
    );
  });
});

// Re-export for tooling
export { isFailure };
