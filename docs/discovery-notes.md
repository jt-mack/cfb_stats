# Discovery notes (Phase 0)

Date: 2026-08-03. Probes: `scripts/discovery-probes.mjs`, `scripts/discovery-probes-2025.mjs`.

## D0.1 News — GO

- `espnCfbNews({ limit, parsed: true })` returns usable rows: headline, description, published, images (JSON string), byline, premium, `links_web_href`, categories.
- Prefer **parsed** for mapping; parse `images` / `categories` JSON strings when needed.
- `espnCfbTeamNews` returned empty `{}` / `[]` in preseason for Georgia — still wire it; show empty state when absent.
- News is current-league feed, not historical-by-season.

## D0.2 Season / team leaders — GO (with caveats)

- `espnCfbSeasonTypeLeaders({ season, season_type })` **raw** works for completed seasons (2025). Categories observed:
  `passingYards`, `passingTouchdowns`, `quarterbackRating`, `rushingYards`, `rushingTouchdowns`, `receivingYards`, `receivingTouchdowns`, `receptions`, `totalTackles`, `sacks`, `interceptions`, `interceptionYards`, `kickoffYards`.
- Parsed form returns `[]` — use **raw** and map ourselves.
- Leaders embed athlete/team as `$ref` only; resolve athlete display names via Core athlete URL; extract team id from team `$ref` and use team index.
- 2026 preseason returns **404** — fall back to prior completed season or empty state.
- Site `espnCfbTeamLeaders` returned empty. Derive team leaders by filtering national season-type leaders by team id.
- Web `espnCfbLeaders` (byathlete) works but is harder to sort by category; prefer season-type leaders.

## D0.3 Depth chart — GO endpoint / NO data yet

- `espnCfbTeamDepthcharts({ team_id })` succeeds but returns team header only (no position athletes) in Aug 2026 preseason.
- Ship depth tab with clear **unavailable** empty state. Re-check midseason.

## D0.4 Coach tenure — GO

- Season coach entry: `espnCfbSeasonCoaches` items → Core coach detail has `firstName`, `lastName`, `team.$ref`, `person.$ref`, `records`.
- `espnCfbCoach({ parsed: true })` exposes `career_records` and `coach_seasons` as JSON-stringified `$ref` arrays.
- School-specific tenure: resolve `coach_seasons` refs and keep seasons whose `team.$ref` matches the selected team id.
- `espnCfbCoachRecord` returns career totals (not school-only) — use for overall career summary only; school W-L from filtered season rows + standings fallback.
- Existing `fetchTeamCoachEntry` remains the primary current-coach resolver.

## D0.5 Team season averages — PARTIAL

- `espnCfbTeamRecord` empty in probes.
- `espnCfbStatisticsLeague` is a thin index, not per-team averages.
- **Use ESPN power-index efficiencies** (already mapped) for game compare; label clearly.
- Optional: standings PF/PA / games for crude PPG when present — do not invent yards-per-game without a source.

## D0.6 Historical range — GO

- `espnCfbTeamSchedule({ team_id, season, parsed: true })` returned schedules for 2026, 2021, 2016, **2005**, and **2000**.
- Practical series window: **last 15 seasons** (configurable), disclose “Series since {year}”.

## D0.7 Rankings weeks — GO

- Live `espnCfbRankings({})` returns AP Top 25 + AFCA Coaches (+ FCS polls). Includes `ranks` with team/record/points.
- Currently surfaces **2025 final** rankings during 2026 preseason — product should label season/week.
- `espnCfbSeasonWeekRankings` returns Core `$ref` items for historical weeks (e.g. 2025 week 10).
- Legacy CDN `getRankings` returned HTML (broken) — **fixed in app**: historical seasons use Core week ranking refs via `fetchHistoricalRankingsFromCore` in `lib/sdv/cfb.ts`.
- ESPN site.api returns 403 for sportsdataverse’s default User-Agent — stripped in `lib/sdv/client.ts` before SDV load.

## Season context (year change)

- `espnCfbSeasonInfo({ season })` is the source of truth for phase windows, start/end dates, and whether a season is active.
- `/season/:year/context` maps that payload via `mapSeasonInfoToContextFields` in `lib/season-context.ts`.
- Frontend stores the **active** (default) season context in `GlobalStateContext.activeSeason`.
- Year-agnostic feeds (news, team news, depth, roster) are gated via `lib/activeSeasonFeatures.ts`:
  - require viewing the active season year
  - depth / team news also blocked in preseason
- Viewing-year context still comes from `useSeasonContext(year)` for banners, scoreboard phase, etc.

## Product implications

| Feature | Ship? |
|---------|-------|
| News | Yes |
| National / team leaders | Yes (raw season-type + ref resolve; empty in early preseason) |
| Depth chart UI | Yes with unavailable state |
| Coach school tenure | Yes via coach_seasons filter |
| True PPG / YPG compare | No — keep FPI/efficiency labeled |
| Multi-year series | Yes, 15-year window |
| Rankings page | Yes from site rankings (+ week refs later) |
