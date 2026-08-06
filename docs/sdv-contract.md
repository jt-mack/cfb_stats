# SDV Contract Diagnostic Suite

On-demand checks that compare live SportsDataverse / ESPN responses against our wrappers, mappers, repos, and the domain fields the frontend reads.

**Not a CI gate.** ESPN/preseason empties are flaky; run this when debugging year-switch or field-gap issues.

## Run

```bash
yarn test:sdv-contract
```

Uses `tsx --test` against [`lib/sdv/contract/suite.test.ts`](../lib/sdv/contract/suite.test.ts).

## Season matrix

| Season | Source |
|--------|--------|
| Current | `getDefaultSeason()` (Jan–Mar → previous calendar year) |
| Prior | current − 1 |

Fixture team: Georgia (`61`), same as discovery probes.

## Status meanings

| Status | Meaning |
|--------|---------|
| `ok` | Shape / mapping / repo / UI fields look correct |
| `expected_empty` | Known empty or soft gap (e.g. preseason leaders 404, depth header-only, team news empty, live rankings showing prior final) — **not** a failure |
| `missing_field` | Required path/field absent when we expected data |
| `map_error` | Mapper threw |
| `semantic_mismatch` | Field present but meaning/value wrong for usage |
| `error` | Request/crash failure |

Exit code is non-zero when any unexplained failure (`missing_field`, `map_error`, `semantic_mismatch`, `error`) is present. `expected_empty` does not fail the suite.

A JSON report is written to `tmp/sdv-contract-report.json` (gitignored).

## Layers

For each catalog entry the suite checks, in order:

1. Live response shape vs fields our types/mappers read
2. Mapper output
3. Repo / domain output ([`lib/types.ts`](../lib/types.ts))
4. UI field inventory ([`lib/sdv/contract/ui-fields.ts`](../lib/sdv/contract/ui-fields.ts))

Known caveats from [discovery-notes.md](./discovery-notes.md) are encoded as season-aware `expected_empty` rules in the catalog.

## Fix loop

1. Run the suite
2. Triage failures: types → wrappers/mappers → repos → frontend types/usage
3. Re-run until unexplained failures for the **prior** completed season are cleared

## Known infrastructure notes

- ESPN `site.api` returns **403** when sportsdataverse’s default User-Agent is sent. [`lib/sdv/client.ts`](../lib/sdv/client.ts) patches `axios.create` to omit User-Agent on ESPN hosts before loading SDV.
- Historical rankings no longer use legacy `getRankings` (HTML). Prior seasons use Core `espnCfbSeasonWeekRankings` + ranking detail refs.
- Depth charts often return team header only (no athletes); the suite records `expected_empty` when `available=false`.
