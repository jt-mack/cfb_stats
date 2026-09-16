export function athletePath(
  year: string | number,
  athleteId: string | number | null | undefined
): string | null {
  if (athleteId == null || athleteId === "") return null;
  return `/season/${year}/athlete/${athleteId}`;
}
