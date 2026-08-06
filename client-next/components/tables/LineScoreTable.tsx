type LineScoreTableProps = {
  homeTeam: string;
  awayTeam: string;
  homeLineScores: number[] | null;
  awayLineScores: number[] | null;
  homePoints: number | null;
  awayPoints: number | null;
};

function periodLabel(index: number): string {
  const period = index + 1;
  if (period <= 4) return `Q${period}`;
  if (period === 5) return "OT";
  return `${period - 4}OT`;
}

export function LineScoreTable({
  homeTeam,
  awayTeam,
  homeLineScores,
  awayLineScores,
  homePoints,
  awayPoints,
}: LineScoreTableProps) {
  const maxPeriods = Math.max(homeLineScores?.length ?? 0, awayLineScores?.length ?? 0, 4);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-foreground/80">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left font-medium">Team</th>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <th key={i} className="py-2 px-2 text-center font-medium">
                {periodLabel(i)}
              </th>
            ))}
            <th className="py-2 px-2 text-center font-medium">Final</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2 font-medium">{awayTeam}</td>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <td key={i} className="py-2 px-2 text-center">
                {awayLineScores?.[i] ?? "—"}
              </td>
            ))}
            <td className="py-2 px-2 text-center font-semibold">{awayPoints ?? "—"}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium">{homeTeam}</td>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <td key={i} className="py-2 px-2 text-center">
                {homeLineScores?.[i] ?? "—"}
              </td>
            ))}
            <td className="py-2 px-2 text-center font-semibold">{homePoints ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PreseasonBanner({
  year,
  firstGameDate,
  formatDate,
}: {
  year: string;
  firstGameDate: string | null | undefined;
  formatDate: (d: string) => string;
}) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 text-center">
      {firstGameDate
        ? `${year} season opens ${formatDate(firstGameDate)}.`
        : `${year} preseason — schedules and polls update as data is published.`}
    </div>
  );
}
