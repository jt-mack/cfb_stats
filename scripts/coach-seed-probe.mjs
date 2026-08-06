/**
 * Phase 1 coach-seed probe: season coaches list + 2–3 individual drill-downs.
 *
 * Run: node scripts/coach-seed-probe.mjs [season]
 * Example: node scripts/coach-seed-probe.mjs 2026
 */
import sdv from 'sportsdataverse';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const cfb = sdv.cfb;
const season = Number(process.argv[2]) || 2026;
const PAUSE_MS = 250;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'tmp', 'coach-seed-probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rewriteCoreUrl = (url) =>
  String(url || '').replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');

const summarize = (label, value, maxJson = 3500) => {
  const t = Array.isArray(value) ? `array[${value.length}]` : typeof value;
  let keys = '';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    keys = Object.keys(value).slice(0, 30).join(', ');
  } else if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
    keys = Object.keys(value[0]).slice(0, 30).join(', ');
  }
  console.log(`\n=== ${label} ===`);
  console.log(`type: ${t}`);
  if (keys) console.log(`keys: ${keys}`);
  const sample = Array.isArray(value) ? value.slice(0, 2) : value;
  console.log(JSON.stringify(sample, null, 2)?.slice(0, maxJson));
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

const idFromRef = (ref, kind) => {
  if (!ref) return null;
  const m = String(ref).match(new RegExp(`${kind}/(\\d+)`));
  return m ? m[1] : null;
};

const writeJson = (name, data) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`wrote ${file}`);
};

console.log(`Coach seed probe season=${season} pauseMs=${PAUSE_MS}`);

// A) Full season coaches list
const list = await safe('A) espnCfbSeasonCoaches', () =>
  cfb.espnCfbSeasonCoaches({ limit: 500, season })
);

const items = list?.items ?? (Array.isArray(list) ? list : []);
const itemCount = items.length;
const sampleItem = items[0] ?? null;
const itemKeys = sampleItem && typeof sampleItem === 'object' ? Object.keys(sampleItem) : [];
const refOnly = itemKeys.length > 0 && itemKeys.every((k) => k === '$ref');

console.log('\n--- List shape ---');
console.log(`itemCount=${itemCount}`);
console.log(`refOnly=${refOnly}`);
console.log(`sampleItemKeys=${itemKeys.join(', ') || '(none)'}`);
console.log(`listTopKeys=${list && typeof list === 'object' ? Object.keys(list).join(', ') : typeof list}`);

writeJson(`season-coaches-${season}-list.json`, {
  season,
  itemCount,
  refOnly,
  listTopKeys: list && typeof list === 'object' ? Object.keys(list) : [],
  sampleItems: items.slice(0, 5),
  rawType: Array.isArray(list) ? 'array' : typeof list,
});

if (itemCount === 0) {
  console.log('\nNo season coach items — cannot drill down. Done.');
  process.exit(0);
}

// Pick 2–3 coaches: first, middle, last (variety of positions in the list)
const pickIndexes = [...new Set([0, Math.floor(itemCount / 2), itemCount - 1])].slice(0, 3);
const picks = pickIndexes.map((i) => ({ index: i, item: items[i] }));

console.log(`\n--- Selected indexes: ${pickIndexes.join(', ')} ---`);

const findings = [];

for (const { index, item } of picks) {
  const seasonCoachRef = item?.['$ref'] ?? null;
  const coachIdFromList = idFromRef(seasonCoachRef, 'coaches');
  console.log(`\n######## Coach pick index=${index} coachId=${coachIdFromList} ########`);
  console.log(`seasonCoachRef=${seasonCoachRef}`);

  const hop = {
    index,
    seasonCoachRef,
    coachIdFromList,
    coreEntry: null,
    coreEntryError: null,
    fieldsFromCore: {},
    espnCfbCoach: null,
    espnCfbCoachSeason: null,
    espnCfbCoachRecord: null,
    furtherRefs: [],
  };

  await sleep(PAUSE_MS);

  // B1) Direct Core GET of season-coach $ref
  if (seasonCoachRef) {
    try {
      const url = rewriteCoreUrl(seasonCoachRef);
      const res = await axios.get(url, { timeout: 12_000 });
      hop.coreEntry = res.data;
      const data = res.data ?? {};
      hop.fieldsFromCore = {
        id: data.id ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        teamId: idFromRef(data.team?.['$ref'], 'teams'),
        teamRef: data.team?.['$ref'] ?? null,
        personRef: data.person?.['$ref'] ?? null,
        topKeys: Object.keys(data),
        hasRecords: Array.isArray(data.records) ? data.records.length : Boolean(data.records),
      };
      if (data.team?.['$ref']) hop.furtherRefs.push({ kind: 'team', ref: data.team['$ref'] });
      if (data.person?.['$ref']) hop.furtherRefs.push({ kind: 'person', ref: data.person['$ref'] });
      if (Array.isArray(data.records)) {
        for (const r of data.records.slice(0, 3)) {
          const rref = r?.record?.['$ref'] ?? r?.['$ref'];
          if (rref) hop.furtherRefs.push({ kind: 'record', ref: rref });
        }
      }
      summarize(`B) Core season-coach entry [${index}]`, data, 4000);
    } catch (err) {
      hop.coreEntryError = err instanceof Error ? err.message : String(err);
      console.log(`\n=== B) Core season-coach entry [${index}] === FAIL: ${hop.coreEntryError}`);
    }
  }

  const coachId = hop.fieldsFromCore.id ?? coachIdFromList;
  if (!coachId) {
    findings.push(hop);
    continue;
  }

  await sleep(PAUSE_MS);
  hop.espnCfbCoach = await safe(`B) espnCfbCoach parsed [${coachId}]`, () =>
    cfb.espnCfbCoach({ coach_id: coachId, parsed: true })
  );

  // Capture coach_seasons / career_records refs from parsed coach
  const coachRow = Array.isArray(hop.espnCfbCoach) ? hop.espnCfbCoach[0] : hop.espnCfbCoach;
  if (coachRow) {
    for (const key of ['coach_seasons', 'career_records']) {
      const raw = coachRow[key];
      if (!raw) continue;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          hop.furtherRefs.push({
            kind: key,
            count: parsed.length,
            sampleRefs: parsed.slice(0, 3).map((x) => x?.['$ref']).filter(Boolean),
          });
        }
      } catch {
        hop.furtherRefs.push({ kind: key, rawType: typeof raw });
      }
    }
  }

  await sleep(PAUSE_MS);
  hop.espnCfbCoachSeason = await safe(`B) espnCfbCoachSeason [${coachId}] season=${season}`, () =>
    cfb.espnCfbCoachSeason({ coach_id: coachId, season })
  );

  await sleep(PAUSE_MS);
  hop.espnCfbCoachRecord = await safe(`B) espnCfbCoachRecord [${coachId}]`, () =>
    cfb.espnCfbCoachRecord({ coach_id: coachId, record_type: 0, parsed: true })
  );

  // Drop bulky payloads from findings summary (keep shapes)
  findings.push({
    ...hop,
    coreEntry: hop.coreEntry
      ? {
          id: hop.coreEntry.id,
          firstName: hop.coreEntry.firstName,
          lastName: hop.coreEntry.lastName,
          team: hop.coreEntry.team,
          person: hop.coreEntry.person,
          keys: Object.keys(hop.coreEntry),
          recordsSample: Array.isArray(hop.coreEntry.records)
            ? hop.coreEntry.records.slice(0, 2)
            : hop.coreEntry.records,
        }
      : null,
    espnCfbCoach: Array.isArray(hop.espnCfbCoach)
      ? hop.espnCfbCoach.slice(0, 1).map((r) => ({
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          keys: Object.keys(r),
          coach_seasons_preview:
            typeof r.coach_seasons === 'string'
              ? r.coach_seasons.slice(0, 400)
              : r.coach_seasons,
          career_records_preview:
            typeof r.career_records === 'string'
              ? r.career_records.slice(0, 400)
              : r.career_records,
        }))
      : hop.espnCfbCoach,
    espnCfbCoachSeason:
      hop.espnCfbCoachSeason && typeof hop.espnCfbCoachSeason === 'object'
        ? {
            keys: Object.keys(hop.espnCfbCoachSeason),
            sample: JSON.parse(JSON.stringify(hop.espnCfbCoachSeason)).slice?.(0, 1) ??
              Object.fromEntries(
                Object.entries(hop.espnCfbCoachSeason).slice(0, 12)
              ),
          }
        : hop.espnCfbCoachSeason,
    espnCfbCoachRecord: Array.isArray(hop.espnCfbCoachRecord)
      ? hop.espnCfbCoachRecord.slice(0, 1)
      : hop.espnCfbCoachRecord,
  });
}

writeJson(`season-coaches-${season}-drilldowns.json`, { season, picks: findings });

console.log('\n--- Probe summary ---');
for (const f of findings) {
  console.log(
    JSON.stringify(
      {
        index: f.index,
        coachId: f.fieldsFromCore.id ?? f.coachIdFromList,
        teamId: f.fieldsFromCore.teamId,
        name: `${f.fieldsFromCore.firstName ?? ''} ${f.fieldsFromCore.lastName ?? ''}`.trim(),
        coreOk: Boolean(f.coreEntry),
        coachParsedOk: Boolean(f.espnCfbCoach),
        coachSeasonOk: Boolean(f.espnCfbCoachSeason),
        coachRecordOk: Boolean(f.espnCfbCoachRecord),
        furtherRefKinds: f.furtherRefs.map((r) => r.kind),
      },
      null,
      2
    )
  );
}

console.log('\nDone.');
