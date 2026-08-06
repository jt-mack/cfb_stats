/**
 * Seed coach ↔ team associations into data/coaches.json (lowdb).
 *
 * Usage:
 *   npx tsx scripts/seed-coaches.ts 2026
 *   npx tsx scripts/seed-coaches.ts --year 2025 --pause 300
 *
 * Current vs historical: compares seed year to getDefaultSeason().
 * Current year also refreshes currentByTeamId for historical fallback.
 */
import axios from 'axios';
import { upsertSeasonAssociations, type CoachTeamSeason } from '../lib/coaches-db';
import { getCfb, getDefaultSeason } from '../lib/espn-client';
import { teamIndex } from '../lib/team-index';

const DEFAULT_PAUSE_MS = 250;

type SeasonCoachList = {
  count?: number;
  items?: Array<{ '$ref'?: string }>;
};

type CoreSeasonCoach = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  team?: { '$ref'?: string };
};

function parseArgs(argv: string[]): { year: number; pauseMs: number } {
  let year: number | null = null;
  let pauseMs = DEFAULT_PAUSE_MS;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--year' || arg === '-y') {
      year = Number(argv[++i]);
    } else if (arg === '--pause' || arg === '-p') {
      pauseMs = Number(argv[++i]);
    } else if (!arg.startsWith('-') && year == null) {
      year = Number(arg);
    }
  }
  if (year == null || !Number.isFinite(year)) {
    year = getDefaultSeason();
  }
  if (!Number.isFinite(pauseMs) || pauseMs < 0) pauseMs = DEFAULT_PAUSE_MS;
  return { year, pauseMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rewriteCoreUrl(url: string): string {
  return url.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');
}

function idFromRef(ref: string | undefined | null, kind: 'teams' | 'coaches' | 'seasons'): string | null {
  if (!ref) return null;
  const m = ref.match(new RegExp(`${kind}/(\\d+)`));
  return m?.[1] ?? null;
}

function seasonYearFromRef(ref: string | undefined | null): number | null {
  const id = idFromRef(ref, 'seasons');
  return id ? Number(id) : null;
}

async function getCoreJson(url: string): Promise<CoreSeasonCoach> {
  const res = await axios.get(rewriteCoreUrl(url), { timeout: 12_000 });
  return res.data as CoreSeasonCoach;
}

async function resolveTeamIdFromPriorSeasons(
  coachId: string,
  pauseMs: number
): Promise<{ teamId: number; sourceSeason: number } | null> {
  const cfb = await getCfb();
  const rows = (await cfb.espnCfbCoach({ coach_id: coachId, parsed: true })) as Array<{
    coach_seasons?: string;
  }>;
  const raw = rows?.[0]?.coach_seasons;
  if (!raw) return null;

  let refs: Array<{ '$ref'?: string }> = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) refs = parsed;
  } catch {
    return null;
  }

  const sorted = [...refs].sort((a, b) => {
    const ya = seasonYearFromRef(a['$ref']) ?? 0;
    const yb = seasonYearFromRef(b['$ref']) ?? 0;
    return yb - ya;
  });

  for (const item of sorted) {
    const ref = item['$ref'];
    if (!ref) continue;
    await sleep(pauseMs);
    try {
      const entry = await getCoreJson(ref);
      const teamIdStr = idFromRef(entry.team?.['$ref'], 'teams');
      const sourceSeason = seasonYearFromRef(ref);
      if (teamIdStr && sourceSeason != null) {
        return { teamId: Number(teamIdStr), sourceSeason };
      }
    } catch (err) {
      console.warn(
        `  prior season fetch failed for coach ${coachId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
  return null;
}

async function main(): Promise<void> {
  const { year, pauseMs } = parseArgs(process.argv.slice(2));
  const defaultSeason = getDefaultSeason();
  const isCurrent = year === defaultSeason;

  console.log(
    `Seeding coaches year=${year} isCurrent=${isCurrent} (defaultSeason=${defaultSeason}) pauseMs=${pauseMs}`
  );

  const fbsTeams = await teamIndex.getAllTeams(year);
  const fbsIds = new Set(fbsTeams.map((t) => t.id));
  console.log(`FBS teams for ${year}: ${fbsIds.size}`);

  const cfb = await getCfb();
  const list = (await cfb.espnCfbSeasonCoaches({
    season: year,
    limit: 500,
  })) as SeasonCoachList;

  const items = list.items ?? [];
  console.log(`Season coach refs: ${items.length} (count=${list.count ?? items.length})`);

  const rowsByTeam = new Map<number, CoachTeamSeason>();
  const skipped: Array<{ coachId: string; reason: string }> = [];
  const updatedAt = new Date().toISOString();

  for (let i = 0; i < items.length; i++) {
    const ref = items[i]?.['$ref'];
    const coachIdFromRef = idFromRef(ref, 'coaches');
    if (!ref || !coachIdFromRef) {
      skipped.push({ coachId: coachIdFromRef ?? '?', reason: 'missing_ref' });
      continue;
    }

    process.stdout.write(`\r[${i + 1}/${items.length}] coach ${coachIdFromRef}...`);
    await sleep(pauseMs);

    let entry: CoreSeasonCoach;
    try {
      entry = await getCoreJson(ref);
    } catch (err) {
      skipped.push({
        coachId: coachIdFromRef,
        reason: `core_fail:${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const coachId = String(entry.id ?? coachIdFromRef);
    const firstName = entry.firstName ?? '';
    const lastName = entry.lastName ?? '';
    let teamId = Number(idFromRef(entry.team?.['$ref'], 'teams') ?? NaN);
    let teamSource: CoachTeamSeason['teamSource'] = 'season_entry';

    if (!Number.isFinite(teamId)) {
      const prior = await resolveTeamIdFromPriorSeasons(coachId, pauseMs);
      if (prior) {
        teamId = prior.teamId;
        teamSource = 'prior_season';
      }
    }

    if (!Number.isFinite(teamId)) {
      skipped.push({ coachId, reason: 'no_team' });
      continue;
    }
    if (!fbsIds.has(teamId)) {
      skipped.push({ coachId, reason: `non_fbs_team:${teamId}` });
      continue;
    }

    // Prefer season_entry over prior_season if both resolve for same team.
    const existing = rowsByTeam.get(teamId);
    if (existing && existing.teamSource === 'season_entry' && teamSource === 'prior_season') {
      continue;
    }

    rowsByTeam.set(teamId, {
      season: year,
      teamId,
      coachId,
      firstName,
      lastName,
      updatedAt,
      teamSource,
    });
  }

  console.log('');

  const rows = [...rowsByTeam.values()].sort((a, b) => a.teamId - b.teamId);
  await upsertSeasonAssociations(year, rows, { updateCurrent: isCurrent });

  const viaSeason = rows.filter((r) => r.teamSource === 'season_entry').length;
  const viaPrior = rows.filter((r) => r.teamSource === 'prior_season').length;
  const coverage = fbsIds.size ? ((rows.length / fbsIds.size) * 100).toFixed(1) : '0';

  console.log('--- Seed summary ---');
  console.log(`year=${year} isCurrent=${isCurrent}`);
  console.log(`seeded FBS associations: ${rows.length} / ${fbsIds.size} (${coverage}%)`);
  console.log(`teamSource season_entry=${viaSeason} prior_season=${viaPrior}`);
  console.log(`skipped: ${skipped.length}`);
  const reasonCounts = skipped.reduce<Record<string, number>>((acc, s) => {
    const key = s.reason.startsWith('non_fbs')
      ? 'non_fbs_team'
      : s.reason.startsWith('core_fail')
        ? 'core_fail'
        : s.reason;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log('skip reasons:', reasonCounts);

  const missing = [...fbsIds].filter((id) => !rowsByTeam.has(id));
  if (missing.length) {
    console.log(`FBS teams without coach (${missing.length}): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '...' : ''}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
