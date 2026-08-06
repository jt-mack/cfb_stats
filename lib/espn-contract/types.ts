/** Shared types for the on-demand SDV contract diagnostic suite. */

export type SeasonKind = 'current' | 'prior';

export type CheckStatus =
  | 'ok'
  | 'expected_empty'
  | 'missing_field'
  | 'map_error'
  | 'semantic_mismatch'
  | 'error';

export type CheckLayer = 'shape' | 'mapper' | 'repo' | 'ui' | 'raw';

export type CheckResult = {
  entryId: string;
  layer: CheckLayer;
  season: number;
  seasonKind: SeasonKind;
  status: CheckStatus;
  message: string;
  detail?: unknown;
};

export type ContractContext = {
  currentSeason: number;
  priorSeason: number;
  season: number;
  seasonKind: SeasonKind;
  teamId: number;
  teamSchool: string;
  /** Lazily resolved from team schedule; may be null if schedule empty. */
  gameId: number | null;
  resolveGameId: () => Promise<number | null>;
};

export type CatalogEntry = {
  id: string;
  area: string;
  wrapper: string;
  seasons?: SeasonKind[];
  run: (ctx: ContractContext) => Promise<CheckResult[]>;
};

export function isFailure(status: CheckStatus): boolean {
  return (
    status === 'missing_field' ||
    status === 'map_error' ||
    status === 'semantic_mismatch' ||
    status === 'error'
  );
}
