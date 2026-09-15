/** Coerce ESPN numeric fields; empty/invalid → null. */
export function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function numRequired(value: unknown): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Extract a numeric id from an ESPN Core `$ref` URL. */
export function idFromRef(
  ref: string | undefined | null,
  kind: 'athletes' | 'teams' | 'coaches' | 'groups'
): number | null {
  if (!ref) return null;
  const m = ref.match(new RegExp(`${kind}/(\\d+)`));
  return m ? Number(m[1]) : null;
}

export type WinLossRecord = { wins: number; losses: number; ties: number; games: number };

/** Parse a "11-3" or "11-3-1" display string. */
export function parseWlRecord(displayValue: string | undefined): WinLossRecord {
  if (!displayValue) return { wins: 0, losses: 0, ties: 0, games: 0 };
  const parts = displayValue.split('-').map((p) => parseInt(p, 10));
  const wins = Number.isFinite(parts[0]) ? parts[0] : 0;
  const losses = Number.isFinite(parts[1]) ? parts[1] : 0;
  const ties = Number.isFinite(parts[2]) ? parts[2] : 0;
  return { wins, losses, ties, games: wins + losses + ties };
}
