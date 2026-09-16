"use client";

import { useAthlete, useAthleteStats } from "@/lib/hooks/queries";
import { AthleteCard } from "@/components/cards/AthleteCard";
import { AthleteDetails } from "@/components/views/AthleteDetails";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AthleteStatCategory } from "@/lib/types";

type AthletePageClientProps = {
  year: string;
  athleteId: string;
};

function athleteSubtitle(parts: Array<string | null | undefined>): string | null {
  const value = parts.filter(Boolean).join(" · ");
  return value || null;
}

function StatCategoryTable({ category }: { category: AthleteStatCategory }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground/80">{category.displayName}</h3>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead>Team</TableHead>
              {category.labels.map((label) => (
                <TableHead key={label} className="text-right">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {category.seasons.map((row) => (
              <TableRow key={`${row.season}-${row.teamId ?? row.team ?? ""}`}>
                <TableCell>{row.seasonLabel || row.season}</TableCell>
                <TableCell>{row.team ?? "—"}</TableCell>
                {category.labels.map((label, i) => (
                  <TableCell key={label} className="text-right">
                    {row.values[i] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {category.totals.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Career</TableCell>
                <TableCell />
                {category.labels.map((label, i) => (
                  <TableCell key={label} className="text-right">
                    {category.totals[i] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

export default function AthletePageClient({ year, athleteId }: AthletePageClientProps) {
  const validAthlete = /^\d+$/.test(athleteId);
  const validSeason = Boolean(year) && !Number.isNaN(Number(year));
  const { data: athlete, isLoading, isError } = useAthlete(validAthlete ? athleteId : undefined);
  const { data: stats, isLoading: statsLoading } = useAthleteStats(validAthlete ? athleteId : undefined);

  if (!validSeason || !validAthlete) {
    return <PageError message="Invalid route." />;
  }

  if (isLoading) return <PageSpinner heightClass="h-[70vh]" />;
  if (isError || !athlete?.id) {
    return <PageError message="Athlete not found." />;
  }

  const title = athlete.displayName || athlete.fullName;
  const jersey = athlete.jersey ? `#${athlete.jersey}` : null;
  const subtitle = athleteSubtitle([jersey, athlete.position ?? athlete.positionName, athlete.experience]);
  const categories = stats?.categories ?? [];

  return (
    <div className="space-y-4 min-w-0">
      <AthleteCard
        title={title}
        subtitle={subtitle}
        headshot={athlete.headshot}
        links={athlete.links ?? []}
      >
        <AthleteDetails athlete={athlete} />
        <div className="mt-4 space-y-6">
          {statsLoading && !categories.length ? (
            <PageSpinner heightClass="h-[20vh]" />
          ) : !categories.length ? (
            <p className="text-sm text-muted-foreground">No statistics available.</p>
          ) : (
            categories.map((category) => (
              <StatCategoryTable key={category.name || category.displayName} category={category} />
            ))
          )}
        </div>
      </AthleteCard>
    </div>
  );
}
