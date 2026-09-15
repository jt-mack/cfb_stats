/**
 * Types for data returned by the sportsdataverse / ESPN APIs.
 *
 * These mirror ESPN shapes — not our domain types in `lib/types.ts`.
 */

export interface SdvEspnTeam {
  id?: string | number;
  uid?: string;
  slug?: string;
  location?: string;
  name?: string;
  nickname?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  color?: string;
  alternateColor?: string;
  isActive?: boolean;
  rank?: number;
  standingSummary?: string;
  logos?: { href?: string }[];
  logo?: string;
  links?: unknown[];
  groups?:
    | { id?: string; name?: string; shortName?: string; '$ref'?: string }
    | { id?: string; name?: string; shortName?: string }[];
  coach?: { firstName?: string; lastName?: string };
  record?: SdvTeamRecord | { '$ref'?: string };
  ranks?: { '$ref'?: string };
  coaches?: { '$ref'?: string };
  nextEvent?: Array<{ id?: string | number; name?: string; date?: string }>;
}

export interface SdvRef {
  '$ref'?: string;
}

export interface SdvRecordStat {
  name?: string;
  value?: number;
  displayValue?: string;
}

export interface SdvRecordItem {
  description?: string;
  type?: string;
  name?: string;
  summary?: string;
  displayValue?: string;
  stats?: SdvRecordStat[];
}

export interface SdvTeamRecord {
  '$ref'?: string;
  items?: SdvRecordItem[];
}

/** Core `espnCfbSeasonTeam` — identity inline, nested resources as `$ref`. */
export interface SdvSeasonTeam extends SdvEspnTeam {
  venue?: Record<string, unknown> & { '$ref'?: string; id?: string | number };
}

export interface SdvPredictiveMetric {
  name?: string;
  value?: number;
}

export interface SdvParsedPowerIndexRow {
  season?: number;
  team_$ref?: string;
  predictives?: string;
  efficiencies?: string;
  last_updated?: string;
  run_date_time_key?: string;
}

export interface SdvParsedRosterRow {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  display_name?: string;
  jersey?: string | number;
  weight?: string | number;
  display_weight?: string;
  height?: string | number;
  display_height?: string;
  position_abbreviation?: string;
  position_name?: string;
  position_group?: string;
  experience_years?: number;
  experience_display_value?: string;
}

export interface SdvCfbSummaryRaw {
  boxscore?: unknown;
  gameInfo?: unknown;
  drives?: unknown;
  leaders?: unknown;
  header?: Record<string, unknown>;
  scoringPlays?: unknown;
  winprobability?: unknown;
  pickcenter?: unknown;
  odds?: unknown;
  againstTheSpread?: unknown;
  standings?: unknown;
  predictor?: unknown;
}

export interface SdvTeamResponse {
  team?: SdvEspnTeam;
}

export interface SdvSeasonCoachEntry {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  team?: { '$ref'?: string };
  records?: unknown;
}

export interface SdvStandingsStat {
  type?: string;
  displayValue?: string;
  label?: string;
  name?: string;
}

export interface SdvStandingsEntry {
  team?: SdvEspnTeam;
  stats?: SdvStandingsStat[];
}

export interface SdvStandingsResponse {
  uid?: string;
  id?: string | number;
  name?: string;
  shortName?: string;
  season?: number;
  standings?: {
    entries?: SdvStandingsEntry[];
  };
  children?: unknown[];
}

export interface SdvCfbSummary {
  id: number;
  boxScore: unknown;
  gameInfo: unknown;
  drives: unknown;
  leaders: unknown;
  header: unknown;
  teams: unknown;
  scoringPlays: unknown;
  winProbability: unknown;
  competitions: unknown;
  season: unknown;
  week: unknown;
  standings: unknown;
}

export interface SdvCfbPicks {
  id: number;
  gameInfo: unknown;
  leaders: unknown;
  header: unknown;
  teams: unknown;
  competitions: unknown;
  winProbability: unknown;
  pickcenter: unknown;
  againstTheSpread: unknown;
  odds: unknown;
  season: unknown;
  week: unknown;
  standings: unknown;
  predictor: unknown;
}

export interface SdvTeamScheduleResponse {
  events?: Record<string, unknown>[];
}

export interface SdvSeasonTypeInfo {
  id?: string | number;
  type?: number;
  name?: string;
  abbreviation?: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  hasStandings?: boolean;
  slug?: string;
  week?: {
    number?: number;
    startDate?: string;
    endDate?: string;
    text?: string;
  };
}

export interface SdvSeasonInfo {
  year?: number;
  startDate?: string;
  endDate?: string;
  displayName?: string;
  type?: SdvSeasonTypeInfo;
  types?: {
    count?: number;
    items?: SdvSeasonTypeInfo[];
  };
  rankings?: { '$ref'?: string };
  leaders?: { '$ref'?: string };
}
