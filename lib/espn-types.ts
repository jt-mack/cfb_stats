/**
 * Types for data returned by the sportsdataverse package.
 *
 * These mirror ESPN / SDV shapes — not our CFBD-compatible API types in `lib/types.ts`.
 * Raw types align with `sportsdataverse/dist/services/cfb.service.d.ts`.
 * Parsed types align with the snake_cased rows from `{ parsed: true }`.
 */

// ---------------------------------------------------------------------------
// Shared ESPN entity fragments
// ---------------------------------------------------------------------------

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
  links?: unknown[];
  /** ESPN may return groups as an object (`{ id }`) or as an array of groups. */
  groups?:
  | { id?: string; name?: string; shortName?: string }
  | { id?: string; name?: string; shortName?: string }[];
  coach?: { firstName?: string; lastName?: string };
  record?: { items?: { summary?: string; displayValue?: string }[] };
  nextEvent?: Array<{ id?: string | number; name?: string; date?: string }>;
}

export interface SdvPredictiveMetric {
  name?: string;
  value?: number;
}

// ---------------------------------------------------------------------------
// Parsed rows (`{ parsed: true }` via generated ESPN wrappers)
// ---------------------------------------------------------------------------

/** Row from `sdv.cfb.espnCfbTeamSchedule({ parsed: true })`. */
export interface SdvParsedTeamScheduleRow {
  id?: string | number;
  date?: string;
  name?: string;
  short_name?: string;
  season_year?: number;
  season_type_type?: number;
  week_number?: number;
  week_text?: string;
  /** JSON string of competition objects (see `mapParsedTeamScheduleRow`). */
  competitions?: string;
}

/** Row from `sdv.cfb.espnCfbScoreboard({ parsed: true })`. */
export interface SdvParsedScoreboardRow {
  game_id?: string | number;
  date?: string;
  name?: string;
  short_name?: string;
  season_year?: number;
  season_type?: number;
  neutral_site?: boolean;
  conference_competition?: boolean;
  venue_full_name?: string;
  venue_city?: string;
  venue_state?: string;
  venue_id?: string | number;
  venue_indoor?: boolean;
  home_id?: string | number;
  home_location?: string;
  home_display_name?: string;
  home_name?: string;
  home_abbreviation?: string;
  home_score?: string | number;
  home_rank?: number;
  home_winner?: boolean;
  home_color?: string;
  home_alternate_color?: string;
  home_logo?: string;
  away_id?: string | number;
  away_location?: string;
  away_display_name?: string;
  away_name?: string;
  away_abbreviation?: string;
  away_score?: string | number;
  away_rank?: number;
  away_winner?: boolean;
  away_color?: string;
  away_alternate_color?: string;
  away_logo?: string;
  status_type_completed?: boolean;
  status_type_state?: string;
  status_type_description?: string;
  status_type_name?: string;
  status_type_short_detail?: string;
  status_clock?: string;
  status_display_clock?: string;
  status_period?: number;
  broadcast?: string;
  attendance?: number;
  note?: string;
  uid?: string;
}

/** Row from `sdv.cfb.espnCfbSeasonPowerindex({ parsed: true })`. */
export interface SdvParsedPowerIndexRow {
  season?: number;
  team_$ref?: string;
  predictives?: string;
  efficiencies?: string;
  last_updated?: string;
  run_date_time_key?: string;
}

/** Row from `sdv.cfb.espnCfbTeamRoster({ parsed: true })`. */
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

/** Row from `sdv.cfb.espnCfbConferences({ parsed: true })`. */
export interface SdvParsedConferenceRow {
  group_id?: string | number;
  name?: string;
  abbreviation?: string;
  short_name?: string;
  is_conference?: boolean;
  parent_group_id?: string | number;
  depth?: number;
  children_count?: number;
}

/** Row from `sdv.cfb.espnCfbStandings({ parsed: true })`. */
export interface SdvParsedStandingsRow {
  group_name?: string;
  group_abbreviation?: string;
  team_id?: string | number;
  team_name?: string;
  team_abbreviation?: string;
  team_display_name?: string;
  team_location?: string;
  team_logo?: string;
  wins?: number;
  overall?: string;
  vs_conf?: string;
  playoff_seed?: number;
}

// ---------------------------------------------------------------------------
// Raw ESPN JSON from generated `espnCfb*` wrappers
// ---------------------------------------------------------------------------

/** Raw response from `espnCfbSummary({ event_id })`. */
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
}

/** Raw response from `espnCfbTeam({ team_id })`. */
export interface SdvTeamResponse {
  team?: SdvEspnTeam;
}

/** Row from `espnCfbCoach({ parsed: true })`. */
export interface SdvParsedCoachRow {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  career_records?: string;
  coach_seasons?: string;
  '$ref'?: string;
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

/** Normalized game summary used by domain mappers. */
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

/** Pick/odds slice from `espnCfbSummary`. */
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
}

export interface SdvTeamScheduleResponse {
  events?: Record<string, unknown>[];
}

/** @deprecated No generated wrapper; use FBS_CONFERENCES constants. */
export interface SdvConference {
  id?: string | number;
  name?: string;
  abbreviation?: string;
  shortName?: string;
}

/** @deprecated No generated wrapper; use FBS_CONFERENCES constants. */
export interface SdvConferencesResponse {
  conferences?: SdvConference[];
}

/** @deprecated Use fetchGameDrives / fetchGamePlays via espnCfbSummary. */
export type SdvCfbPlayByPlay = SdvCfbSummaryRaw;

/** @deprecated Use SdvTeamResponse */
export type SdvTeamInfoResponse = SdvTeamResponse & {
  team?: SdvEspnTeam & {
    athletes?: Array<{
      id?: string | number;
      displayName?: string;
      displayHeight?: string;
      height?: unknown;
      weight?: unknown;
      jersey?: unknown;
      position?: { abbreviation?: string };
      experience?: { years?: number };
    }>;
  };
};

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

/** Raw response from `espnCfbSeasonInfo({ season })` (Core seasons/{year}). */
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
