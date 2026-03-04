"use client";

import { useState, useEffect } from "react";
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
import { getCoaches } from "@/lib/repos";
import type { Coach, CoachSeason } from "@/lib/types";

/** Normalize API response (may be camelCase or snake_case). */
function normalizeCoach(raw: Record<string, unknown>): Coach {
  const seasons = (raw.seasons ?? (raw as { seasons?: CoachSeason[] }).seasons) as CoachSeason[] | undefined;
  return {
    firstName: (raw.firstName ?? raw.first_name) as string,
    lastName: (raw.lastName ?? raw.last_name) as string,
    hireDate: (raw.hireDate ?? raw.hire_date) as string,
    seasons: Array.isArray(seasons) ? seasons.map(normalizeCoachSeason) : [],
  };
}

function normalizeCoachSeason(s: Record<string, unknown> | CoachSeason): CoachSeason {
  const r = s as Record<string, unknown>;
  const num = (key: string, alt: string) => {
    const v = r[key] ?? r[alt];
    return v != null ? Number(v) : undefined;
  };
  return {
    school: String(r.school ?? ""),
    year: Number(r.year ?? 0),
    games: Number(r.games ?? 0),
    wins: Number(r.wins ?? 0),
    losses: Number(r.losses ?? 0),
    ties: Number(r.ties ?? 0),
    preseasonRank: num("preseasonRank", "preseason_rank") || undefined,
    postseasonRank: num("postseasonRank", "postseason_rank") || undefined,
    srs: num("srs", "srs"),
    spOverall: num("spOverall", "sp_overall"),
    spOffense: num("spOffense", "sp_offense"),
    spDefense: num("spDefense", "sp_defense"),
  };
}
import { ExternalLink, Calendar, Trophy } from "lucide-react";

type CoachProps = {
  teamId: string;
  teamSchool: string;
  season: string;
};

function coachName(c: Coach): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Coach";
}

function formatHireDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export function Coach({ teamId, teamSchool, season }: CoachProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seasonNum = season ? Number(season) : undefined;

  useEffect(() => {
    if (!teamId || seasonNum == null || Number.isNaN(seasonNum)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getCoaches(teamId, seasonNum)
      .then((data) => setCoaches(Array.isArray(data) ? data.map((c) => normalizeCoach(c as unknown as Record<string, unknown>)) : []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load coach");
        setCoaches([]);
      })
      .finally(() => setLoading(false));
  }, [teamId, seasonNum]);

  if (loading) {
    return (
      <div className="py-8 text-center text-zinc-400">
        Loading coach info…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-400">
        {error}
      </div>
    );
  }

  if (!coaches.length) {
    return (
      <div className="py-8 text-center text-zinc-400">
        No coach data available for this season.
      </div>
    );
  }

  // Show first coach (typically head coach); optionally show others as secondary
  const primary = coaches[0];
  const currentSchoolSeason = primary.seasons?.find(
    (s) => s.school === teamSchool && s.year === seasonNum
  );
  const otherSeasons = (primary.seasons ?? [])
    .filter((s) => !(s.school === teamSchool && s.year === seasonNum))
    .sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-6 min-w-0">
      {/* Current coach – highlighted stats at this school */}
      <Card className="border-zinc-700 bg-zinc-800 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-100">
              {coachName(primary)}
            </h3>
            {primary.hireDate && (
              <span className="flex items-center gap-1 text-sm text-zinc-400">
                <Calendar className="h-4 w-4" />
                Hired {formatHireDate(primary.hireDate)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSchoolSeason ? (
            <div className="rounded-lg border border-zinc-600 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
                <Trophy className="h-4 w-4" />
                At {teamSchool} — {currentSchoolSeason.year} season
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <StatBlock
                  label="Record"
                  value={`${currentSchoolSeason.wins}-${currentSchoolSeason.losses}${currentSchoolSeason.ties ? `-${currentSchoolSeason.ties}` : ""}`}
                />
                <StatBlock label="Games" value={String(currentSchoolSeason.games)} />
                {currentSchoolSeason.postseasonRank != null && currentSchoolSeason.postseasonRank > 0 && (
                  <StatBlock label="Final rank" value={`#${currentSchoolSeason.postseasonRank}`} />
                )}
                {currentSchoolSeason.preseasonRank != null && currentSchoolSeason.preseasonRank > 0 && (
                  <StatBlock label="Preseason rank" value={`#${currentSchoolSeason.preseasonRank}`} />
                )}
                {typeof currentSchoolSeason.srs === "number" && (
                  <StatBlock label="SRS" value={currentSchoolSeason.srs.toFixed(1)} />
                )}
                {typeof currentSchoolSeason.spOverall === "number" && (
                  <StatBlock label="SP+ Overall" value={currentSchoolSeason.spOverall.toFixed(1)} />
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              No season record at {teamSchool} for {season}.
            </p>
          )}

          {/* Coaching history – previous schools and years */}
          {otherSeasons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-2">
                Coaching history
              </h4>
              <div className="rounded-md border border-zinc-700 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-700 hover:bg-transparent">
                      <TableHead className="text-zinc-400 text-xs sm:text-sm">School</TableHead>
                      <TableHead className="text-zinc-400 text-xs sm:text-sm">Year</TableHead>
                      <TableHead className="text-zinc-400 text-xs sm:text-sm">Record</TableHead>
                      <TableHead className="text-zinc-400 text-xs sm:text-sm w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherSeasons.map((s, idx) => (
                      <CoachHistoryRow
                        key={`${s.school}-${s.year}-${idx}`}
                        season={s}
                        currentSeasonYear={seasonNum}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional coaches (e.g. coordinators) – compact list */}
      {coaches.length > 1 && (
        <Card className="border-zinc-700 bg-zinc-800 overflow-hidden">
          <CardHeader className="py-2">
            <h4 className="text-sm font-medium text-zinc-400">Other staff</h4>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm text-zinc-300">
              {coaches.slice(1).map((c, i) => (
                <li key={i}>{coachName(c)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function CoachHistoryRow({
  season,
  currentSeasonYear,
}: {
  season: CoachSeason;
  currentSeasonYear: number | undefined;
}) {
  const record = `${season.wins}-${season.losses}${season.ties ? `-${season.ties}` : ""}`;
  const href =
    currentSeasonYear != null
      ? `/season/${season.year}/team/${encodeURIComponent(season.school)}`
      : "#";

  return (
    <TableRow className="border-zinc-700 hover:bg-zinc-800/80">
      <TableCell className="font-medium text-zinc-100 text-sm py-2 sm:py-3">
        <Link
          href={href}
          className="hover:text-zinc-50 hover:underline"
        >
          {season.school}
        </Link>
      </TableCell>
      <TableCell className="text-zinc-400 text-sm py-2 sm:py-3">{season.year}</TableCell>
      <TableCell className="text-zinc-400 text-sm py-2 sm:py-3">
        {record} {season.games ? `(${season.games} games)` : ""}
      </TableCell>
      <TableCell className="py-2 sm:py-3">
        <Link
          href={href}
          className="text-zinc-500 hover:text-zinc-300 inline-flex"
          aria-label={`View ${season.school} ${season.year}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}
