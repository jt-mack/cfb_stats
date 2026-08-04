/**
 * Follow-up probes against 2025 completed season.
 * Run: node scripts/discovery-probes-2025.mjs
 */
import sdv from 'sportsdataverse';
import axios from 'axios';

const cfb = sdv.cfb;
const season = 2025;
const TEAM_ID = 61;

const summarize = (label, value) => {
  const t = Array.isArray(value) ? `array[${value.length}]` : typeof value;
  let keys = '';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    keys = Object.keys(value).slice(0, 25).join(', ');
  } else if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
    keys = Object.keys(value[0]).slice(0, 30).join(', ');
  }
  console.log(`\n=== ${label} ===`);
  console.log(`type: ${t}`);
  if (keys) console.log(`keys: ${keys}`);
  const sample = Array.isArray(value) ? value.slice(0, 2) : value;
  console.log(JSON.stringify(sample, null, 2)?.slice(0, 3000));
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

await safe('leaders season_type 2 2025', () =>
  cfb.espnCfbSeasonTypeLeaders({ season, season_type: 2 }));
await safe('leaders season_type 2 2025 parsed', () =>
  cfb.espnCfbSeasonTypeLeaders({ season, season_type: 2, parsed: true }));
await safe('leaders season_type 3 2025', () =>
  cfb.espnCfbSeasonTypeLeaders({ season, season_type: 3 }));

await safe('team leaders 2025', () =>
  cfb.espnCfbTeamLeaders({ team_id: TEAM_ID, season }));
await safe('team leaders 2025 parsed', () =>
  cfb.espnCfbTeamLeaders({ team_id: TEAM_ID, season, parsed: true }));

// Inspect wrapper params via raw call variants
await safe('team leaders season_year', () =>
  cfb.espnCfbTeamLeaders({ team_id: TEAM_ID, season_year: season }));

await safe('depthcharts season', () =>
  cfb.espnCfbTeamDepthcharts({ team_id: TEAM_ID, season }));
await safe('depthcharts 2025', () =>
  cfb.espnCfbTeamDepthcharts({ team_id: TEAM_ID, season: 2025 }));

// Season coaches
const coaches = await safe('season coaches 2025', () =>
  cfb.espnCfbSeasonCoaches({ season, limit: 20 }));
const firstRef = coaches?.items?.[0]?.['$ref'];
console.log('first coach ref', firstRef);
if (firstRef) {
  const detail = await axios.get(firstRef.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com'), { timeout: 10000 });
  console.log('\n=== coach detail keys ===', Object.keys(detail.data));
  console.log(JSON.stringify(detail.data, null, 2).slice(0, 2000));
  const cid = detail.data?.id;
  if (cid) {
    await safe('coach parsed', () => cfb.espnCfbCoach({ coach_id: cid, parsed: true }));
    await safe('coach record', () => cfb.espnCfbCoachRecord({ coach_id: cid, record_type: 0, parsed: true }));
    await safe('coach season', () => cfb.espnCfbCoachSeason({ coach_id: cid, season }));
  }
}

// Team record with season
await safe('team record season', () =>
  cfb.espnCfbTeamRecord({ team_id: TEAM_ID, season }));
await safe('team record season parsed', () =>
  cfb.espnCfbTeamRecord({ team_id: TEAM_ID, season, parsed: true }));

// Power index for season stats stand-in
await safe('powerindex 2025 parsed sample', async () => {
  const rows = await cfb.espnCfbSeasonPowerindex({ season, parsed: true });
  return Array.isArray(rows) ? rows.filter((r) => String(r.team_id) === String(TEAM_ID) || String(r.id) === String(TEAM_ID)).slice(0, 1) || rows.slice(0, 1) : rows;
});

// Rankings historical via site + week rankings for 2025 week 10
await safe('week rankings 2025 w10', () =>
  cfb.espnCfbSeasonWeekRankings({ season, season_type: 2, week: 10 }));
await safe('rankings live has polls', async () => {
  const r = await cfb.espnCfbRankings({});
  return {
    rankingNames: (r.rankings || []).map((x) => ({ id: x.id, name: x.name, type: x.type, ranks: x.ranks?.length })),
    latestWeek: r.latestWeek,
    latestSeason: r.latestSeason,
  };
});

// Leaders core
await safe('espnCfbLeaders', () => cfb.espnCfbLeaders({}));
await safe('espnCfbLeadersCore', () => cfb.espnCfbLeadersCore({}));

console.log('\nDone.');
