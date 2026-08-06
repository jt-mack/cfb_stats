# Coach seed findings (Phase 1)

Date: 2026-08-06. Probe: `node scripts/coach-seed-probe.mjs 2026` (+ follow-up drills into `coach_seasons`).

Raw artifacts: `tmp/coach-seed-probe/season-coaches-2026-*.json`.

## Endpoint chain

```text
espnCfbSeasonCoaches({ season, limit: 500 })
  └─ items[]: { $ref: ".../seasons/{season}/coaches/{coachId}" }   // ref-only list
       │
       ├─ GET Core $ref  → season-coach entry
       │     fields: id, firstName, lastName, person.$ref
       │     team.$ref + records[]  → present for completed seasons (e.g. 2025)
       │     team.$ref              → ABSENT for 2026 preseason entries
       │
       ├─ espnCfbCoach({ coach_id, parsed: true })  → [row]
       │     fields: id, first_name, last_name
       │     career_records: JSON-stringified [{ $ref }]
       │     coach_seasons: JSON-stringified [{ $ref: ".../seasons/{y}/coaches/{id}" }]
       │
       ├─ espnCfbCoachSeason({ coach_id, season })  → 404 for 2026 (unusable for seed)
       │
       └─ espnCfbCoachRecord({ coach_id, record_type: 0, parsed: true })
             → career W-L summary only (optional for association seed)
```

Team association for tenure / prior seasons:

```text
coach_seasons $ref → GET Core season-coach entry (prior year)
  └─ team.$ref: ".../seasons/{y}/teams/{teamId}"
  └─ records[].record.$ref (W-L for that season — not needed for association seed)
```

## Probe results (2026)

| Step | Result |
|------|--------|
| Season coaches list | **268** items, `$ref`-only, single page (`count/pageSize/pageCount`) |
| Core season-coach (3 samples) | Always has `id`, `firstName`, `lastName`, `person` |
| Core `team.$ref` on 2026 entry | **Missing** on all 3 samples (Alex Golesh, Sam Shade, Lance Anderson) |
| Core `team.$ref` on 2025 entry | **Present** (e.g. Golesh → teams/2) |
| `espnCfbCoach` parsed | Reliable names + `coach_seasons` / `career_records` ref lists |
| `espnCfbCoachSeason` for 2026 | **404** — do not use for seed |
| `espnCfbCoachRecord` | Career totals only — optional for UI enrich, not for coach↔team seed |

List includes FCS / non-FBS coaches (~268 ≫ ~130 FBS). Seed should filter to known FBS team ids.

## Minimum fields to store

For durable association (v1):

| Field | Source |
|-------|--------|
| `coachId` | Core season-coach `id` or `/coaches/(\d+)/` in `$ref` |
| `teamId` | Core `team.$ref` `/teams/(\d+)/` when present; else most-recent prior `coach_seasons` entry that has `team` |
| `season` | Seed CLI year |
| `firstName` / `lastName` | Core entry (or parsed coach) |
| `updatedAt` | Seed timestamp |
| `teamSource` | `season_entry` \| `prior_season` (for debugging coverage quality) |

`currentByTeamId[teamId] = coachId` refreshed only when seeding the **current/default** season.

## Mandatory vs optional calls for seed

**Mandatory per coach (association):**

1. GET Core season-coach `$ref` (names + id; team if completed season).
2. If `team` missing (typical for in-progress / preseason year): `espnCfbCoach({ parsed: true })` then GET the newest `coach_seasons` Core entry that includes `team.$ref`.

**Optional (not for association seed):**

- `espnCfbCoachRecord` — career W-L for UI enrich at serve time.
- Resolving every historical `coach_seasons` row — leave to existing `enrichCoachTenure` on read.
- `espnCfbCoachSeason` — broken/404 for 2026.

## Gaps / risks for 2026

1. **No team on current-season Core entry** — must infer from latest completed `coach_seasons` year. Offseason hires who switched schools may map to the **previous** school until ESPN attaches `team` on the 2026 entry.
2. **Brand-new head coaches** with empty `coach_seasons` cannot be team-associated via this chain — log and skip (or later: manual override / team fragment when available).
3. **List is not FBS-only** — filter with FBS team index / standings ids after resolution.
4. **Rate limits** — ~268 Core GETs + ~268 coach parses + some prior-season GETs. Use an explicit pause (≥200–250ms) between coach fetches on top of the app ESPN queue.
5. **`espnCfbTeam` / site API** can 403 under sportsdataverse’s default User-Agent; seed should use Core `$ref` GETs (and app `sdvRequest` / stripped UA) rather than raw site team calls.

## Recommended seed algorithm

```text
seed(year):
  isCurrent = (year === getDefaultSeason())
  list = espnCfbSeasonCoaches({ season: year, limit: 500 })
  fbsTeamIds = set of FBS team ids for year (standings / team index)

  for each item in list.items (with pause):
    entry = GET rewrite(item.$ref)
    coachId, firstName, lastName = entry
    teamId = idFromRef(entry.team.$ref, teams)

    if !teamId:
      parsed = espnCfbCoach({ coach_id, parsed: true })
      for seasonRef in coach_seasons sorted by season year desc (with pause):
        prior = GET seasonRef
        teamId = idFromRef(prior.team.$ref, teams)
        if teamId: break  # teamSource = prior_season

    if !teamId or teamId not in fbsTeamIds: skip / log
    upsert bySeason[year] row
    if isCurrent: currentByTeamId[teamId] = coachId

  print coverage: seeded unique FBS teams / fbsTeamIds.size
```

**Historical year seed:** same loop; write `bySeason[year]` only; do **not** overwrite `currentByTeamId`.

**Serve path (Phase 2):**

1. Lookup `(teamId, season)` in `bySeason`.
2. Else lookup `currentByTeamId[teamId]` (+ coach name from any stored row / coaches map).
3. Else optional live ESPN fallback.
4. Tenure enrich still via `espnCfbCoach` + `coach_seasons` when `coachId` known.

## Pause strategy

- Probe used **250ms** between individual coach-related HTTP calls — no rate-limit failures on 3 coaches.
- Full seed: **250ms** default pause between coaches (CLI-overridable), plus existing `MIN_REQUEST_GAP_MS` (75ms) when going through `sdvRequest`.

## Confirmation checklist

- [x] Season list is ref-only; Core GET required per coach.
- [x] 2026 association needs prior-season `team.$ref` drill-down.
- [x] `espnCfbCoachSeason` not part of seed.
- [x] Store coachId ↔ teamId ↔ season (+ names); refresh `currentByTeamId` only for current year.
- [x] Filter to FBS; pause between fetches.
- [x] User reviewed findings (proceeding with Phase 2 per implement-all instruction).

## First seed run (2026)

```bash
npx tsx scripts/seed-coaches.ts 2026
```

| Metric | Value |
|--------|-------|
| FBS teams | 138 |
| Seeded associations | **134 (97.1%)** |
| `teamSource=season_entry` | 8 |
| `teamSource=prior_season` | 126 |
| Skipped non-FBS | 132 |
| Missing FBS team ids | 256, 6, 2649, 259 |

Likely gaps: brand-new 2026 hires with no prior `coach_seasons` team, or prior-season inference pointing at a non-FBS / wrong school until ESPN attaches `team` on the 2026 Core entry.

## Probe command

```bash
node scripts/coach-seed-probe.mjs 2026
```
