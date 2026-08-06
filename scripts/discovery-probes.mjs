/**
 * Phase 0 discovery probes for Areas A–F.
 * Run: node scripts/discovery-probes.mjs
 */
import sdv from 'sportsdataverse';

const cfb = sdv.cfb;
const season = new Date().getMonth() <= 2 ? new Date().getFullYear() - 1 : new Date().getFullYear();
// Georgia
const TEAM_ID = 61;
const summarize = (label, value) => {
  const t = Array.isArray(value) ? `array[${value.length}]` : typeof value;
  let keys = '';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    keys = Object.keys(value).slice(0, 20).join(', ');
  } else if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
    keys = Object.keys(value[0]).slice(0, 25).join(', ');
  }
  console.log(`\n=== ${label} ===`);
  console.log(`type: ${t}`);
  if (keys) console.log(`keys: ${keys}`);
  const sample = Array.isArray(value) ? value.slice(0, 2) : value;
  console.log(JSON.stringify(sample, null, 2)?.slice(0, 2500));
};

const safe = async (label, fn) => {
  try {
    const result = await fn();
    summarize(label, result);
    return result;
  } catch (err) {
    console.log(`\n=== ${label} === FAIL: ${err instanceof Error ? err.message : err}`);
    return null;
  }
};

console.log(`Discovery season=${season} team=${TEAM_ID}`);

// D0.1 News
await safe('D0.1 espnCfbNews', () => cfb.espnCfbNews({ limit: 5 }));
await safe('D0.1 espnCfbNews parsed', () => cfb.espnCfbNews({ limit: 5, parsed: true }));
await safe('D0.1 espnCfbTeamNews', () => cfb.espnCfbTeamNews({ team_id: TEAM_ID, limit: 3 }));
await safe('D0.1 espnCfbTeamNews parsed', () => cfb.espnCfbTeamNews({ team_id: TEAM_ID, limit: 3, parsed: true }));

// D0.2 Leaders
await safe('D0.2 espnCfbSeasonTypeLeaders', () =>
  cfb.espnCfbSeasonTypeLeaders({ season, season_type: 2 }));
await safe('D0.2 espnCfbSeasonTypeLeaders parsed', () =>
  cfb.espnCfbSeasonTypeLeaders({ season, season_type: 2, parsed: true }));
await safe('D0.2 espnCfbTeamLeaders', () => cfb.espnCfbTeamLeaders({ team_id: TEAM_ID }));
await safe('D0.2 espnCfbTeamLeaders parsed', () =>
  cfb.espnCfbTeamLeaders({ team_id: TEAM_ID, parsed: true }));

// D0.3 Depth
await safe('D0.3 espnCfbTeamDepthcharts', () => cfb.espnCfbTeamDepthcharts({ team_id: TEAM_ID }));
await safe('D0.3 espnCfbTeamDepthcharts parsed', () =>
  cfb.espnCfbTeamDepthcharts({ team_id: TEAM_ID, parsed: true }));

// D0.4 Coach — need a coach id; pull from team
const team = await safe('D0.4 espnCfbTeam', () => cfb.espnCfbTeam({ team_id: TEAM_ID }));
const coachRef = team?.team?.coach?.['$ref'] || team?.coach?.['$ref'];
const coachId = coachRef?.match(/coaches\/(\d+)/)?.[1] || team?.team?.coach?.id;
console.log('coachId', coachId);
if (coachId) {
  await safe('D0.4 espnCfbCoach parsed', () => cfb.espnCfbCoach({ coach_id: coachId, parsed: true }));
  await safe('D0.4 espnCfbCoachRecord parsed', () =>
    cfb.espnCfbCoachRecord({ coach_id: coachId, record_type: 0, parsed: true }));
  await safe('D0.4 espnCfbCoachSeason', () =>
    cfb.espnCfbCoachSeason({ coach_id: coachId, season }));
}

// D0.5 Team season averages
await safe('D0.5 espnCfbTeamRecord', () => cfb.espnCfbTeamRecord({ team_id: TEAM_ID }));
await safe('D0.5 espnCfbTeamRecord parsed', () =>
  cfb.espnCfbTeamRecord({ team_id: TEAM_ID, parsed: true }));
await safe('D0.5 espnCfbStatisticsLeague', () => cfb.espnCfbStatisticsLeague({}));
await safe('D0.5 espnCfbStatisticsLeague parsed', () =>
  cfb.espnCfbStatisticsLeague({ parsed: true }));
await safe('D0.5 espnCfbSeasonPowerindexLeaders parsed', () =>
  cfb.espnCfbSeasonPowerindexLeaders({ season, parsed: true }));

// D0.6 Historical range — sample schedules
for (const year of [season, season - 5, season - 10, 2005, 2000]) {
  await safe(`D0.6 schedule ${year}`, async () => {
    const rows = await cfb.espnCfbTeamSchedule({ team_id: TEAM_ID, season: year, parsed: true });
    return { year, count: Array.isArray(rows) ? rows.length : 0, sample: Array.isArray(rows) ? rows[0] : rows };
  });
}

// D0.7 Rankings
await safe('D0.7 espnCfbRankings live', () => cfb.espnCfbRankings({}));
await safe('D0.7 espnCfbSeasonWeekRankings', () =>
  cfb.espnCfbSeasonWeekRankings({ season, season_type: 2, week: 1 }));
await safe('D0.7 getRankings historical', () => cfb.getRankings({ year: season - 1, week: 5 }));

console.log('\nDone.');
