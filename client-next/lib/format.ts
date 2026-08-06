
/** Format height stored as total inches (API roster shape). */
export function formatHeightInches(inches: number | null | undefined): string {
  if (inches == null || !Number.isFinite(inches) || inches <= 0) return "—";
  const feet = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);
  return `${feet}'${remaining}"`;
}

/** Normalize ESPN drive JSON from `/games/:id/drives`. */
export function normalizeEspnDrive(
  raw: Record<string, unknown>,
  homeTeam: string,
  awayTeam: string
) {
  const team = raw.team as { shortDisplayName?: string; displayName?: string; name?: string } | undefined;
  const offense =
    team?.shortDisplayName ?? team?.displayName ?? team?.name ?? "Unknown";
  const offenseLower = offense.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  const defense =
    offenseLower === homeLower || homeLower.includes(offenseLower) || offenseLower.includes(homeLower)
      ? awayTeam
      : homeTeam;

  return {
    id: String(raw.id ?? ""),
    offense,
    defense,
    yards: Number(raw.yards ?? 0),
    plays: Number(raw.offensivePlays ?? raw.plays ?? raw.playCount ?? 0),
    scoring: Boolean(raw.isScore ?? raw.scoring),
  };
}

/** Normalize ESPN play JSON from `/games/:id/plays`. */
export function normalizeEspnPlay(raw: Record<string, unknown>) {
  const periodRaw = raw.period as { number?: number } | number | undefined;
  const period = typeof periodRaw === "number" ? periodRaw : periodRaw?.number ?? 0;
  const clock = raw.clock as
    | { minutes?: number | null; seconds?: number | null; displayValue?: string }
    | undefined;

  let minutes = clock?.minutes ?? null;
  let seconds = clock?.seconds ?? null;
  if ((minutes == null || seconds == null) && clock?.displayValue) {
    const [m, s] = clock.displayValue.split(":");
    minutes = parseInt(m, 10) || 0;
    seconds = parseInt(s, 10) || 0;
  }

  return {
    id: String(raw.id ?? ""),
    period,
    clock: { minutes, seconds },
    playText: String(raw.text ?? raw.playText ?? ""),
    yardsGained: raw.statYardage != null ? Number(raw.statYardage) : null,
  };
}

