"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Coach, CoachSeason } from "@/lib/types";
import { Calendar, Trophy } from "lucide-react";
import { useCoaches } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";

type CoachProps = {
  teamId: string;
  season: string;
};

function coachName(c: Coach): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Coach";
}

function formatHireDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function Coach({ teamId, season }: CoachProps) {
  const seasonNum = season ? Number(season) : undefined;
  const { data: coaches = [], isLoading, isError, error } = useCoaches(teamId, seasonNum);

  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) {
    return <PageError message={error instanceof Error ? error.message : "Failed to load coach."} />;
  }
  if (!coaches.length) {
    return <p className="py-8 text-center text-zinc-400">No coach data available for this season.</p>;
  }

  const primary = coaches[0];
  const currentSeason = primary.seasons?.find((s) => s.year === seasonNum);

  return (
    <div className="space-y-4">
      <Card className="border-zinc-700 bg-zinc-800">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold text-zinc-100">{coachName(primary)}</h3>
          {primary.hireDate && (
            <p className="text-sm text-zinc-400 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {/^\d{4}$/.test(primary.hireDate)
                ? `First season ${primary.hireDate}`
                : `Hired ${formatHireDate(primary.hireDate)}`}
              {primary.seasonsAtSchool != null ? ` · ${primary.seasonsAtSchool} season(s) at school` : ""}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-zinc-300">
          {primary.schoolRecordSummary && (
            <p>Record at school: {primary.schoolRecordSummary}</p>
          )}
          {primary.careerRecordSummary && (
            <p className="text-zinc-400">Career overall: {primary.careerRecordSummary}</p>
          )}
          {currentSeason && (
            <p>
              {currentSeason.year} Record: {currentSeason.wins}-{currentSeason.losses}
              {currentSeason.ties ? `-${currentSeason.ties}` : ""}
            </p>
          )}
          {primary.partialTenure && (
            <p className="text-xs text-amber-400/90">Partial tenure data — some seasons may be missing.</p>
          )}
        </CardContent>
      </Card>

      {primary.seasons && primary.seasons.length > 0 && (
        <Card className="border-zinc-700 bg-zinc-800">
          <CardHeader className="pb-2">
            <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Coaching History
            </h4>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Year</TableHead>
                  <TableHead className="text-zinc-400">School</TableHead>
                  <TableHead className="text-zinc-400">Record</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...primary.seasons]
                  .sort((a, b) => b.year - a.year)
                  .map((s: CoachSeason) => (
                    <TableRow key={`${s.school}-${s.year}`} className="border-zinc-700">
                      <TableCell className="text-zinc-200">{s.year}</TableCell>
                      <TableCell>
                        <Link
                          href={`/season/${s.year}/team/${encodeURIComponent(s.school)}`}
                          className="text-zinc-200 hover:text-zinc-100 underline-offset-2 hover:underline"
                        >
                          {s.school}
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {s.wins}-{s.losses}
                        {s.ties ? `-${s.ties}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
