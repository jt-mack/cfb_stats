/** ESPN group id for FBS (Football Bowl Subdivision). */
export const FBS_GROUP = 80;

/** ESPN group id for FCS. */
export const FCS_GROUP = 81;

/** Regular season seasontype on ESPN scoreboard API. */
export const REGULAR_SEASON_TYPE = 2;

/** Postseason seasontype on ESPN scoreboard API. */
export const POSTSEASON_SEASON_TYPE = 3;

/** Power conferences surfaced in quick-links (ACC, Big 12, Big Ten, SEC). */
export const MAIN_CONFERENCE_IDS = new Set([1, 4, 5, 8]);

/**
 * ESPN FBS conference group ids (stable). Used with `espnCfbStandings`.
 * Legacy `getConferences` hit a scoreboard/conferences URL with no generated wrapper.
 */
export const FBS_CONFERENCES = [
  { id: 1, name: 'Atlantic Coast Conference', abbreviation: 'ACC', shortName: 'ACC' },
  { id: 4, name: 'Big 12 Conference', abbreviation: 'Big 12', shortName: 'Big 12' },
  { id: 5, name: 'Big Ten Conference', abbreviation: 'Big Ten', shortName: 'Big Ten' },
  { id: 8, name: 'Southeastern Conference', abbreviation: 'SEC', shortName: 'SEC' },
  { id: 9, name: 'Pac-12 Conference', abbreviation: 'Pac-12', shortName: 'Pac-12' },
  { id: 12, name: 'American Conference', abbreviation: 'American', shortName: 'American' },
  { id: 15, name: 'Conference USA', abbreviation: 'CUSA', shortName: 'CUSA' },
  { id: 17, name: 'Mid-American Conference', abbreviation: 'MAC', shortName: 'MAC' },
  { id: 18, name: 'Mountain West Conference', abbreviation: 'MWC', shortName: 'MWC' },
  { id: 37, name: 'Sun Belt Conference', abbreviation: 'Sun Belt', shortName: 'Sun Belt' },
  { id: 151, name: 'American Conference', abbreviation: 'American', shortName: 'American' },
  { id: 80, name: 'FBS', abbreviation: 'FBS', shortName: 'FBS' },
] as const;

export const FBS_CONFERENCE_BY_ID = new Map(FBS_CONFERENCES.map((c) => [c.id, c]));

export const FBS_CONFERENCE_BY_ABBR = new Map(
  FBS_CONFERENCES.flatMap((c) => [
    [c.abbreviation.toLowerCase(), c],
    [c.shortName.toLowerCase(), c],
    [String(c.id), c],
  ] as const)
);
