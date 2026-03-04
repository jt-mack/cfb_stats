"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getTeams } from "@/lib/repos";
import type { FbsTeamWithRank } from "@/lib/types";
import { TeamsTable } from "@/components/tables/TeamsTable";
import { Skeleton } from "@/components/ui/skeleton";

function mapTeamToRow(team: FbsTeamWithRank) {
  return {
    id: team.id,
    name: team.mascot ? `${team.school} ${team.mascot}` : team.school,
    rank: team.rank ?? 0,
    logo: team.logos?.[0] ?? "",
  };
}

export default function SeasonPageClient() {
  const params = useParams();
  const router = useRouter();
  const year = params?.year as string | undefined;
  const [teams, setTeams] = useState<ReturnType<typeof mapTeamToRow>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    if (!year) return;
    const yearNum = Number(year);
    if (Number.isNaN(yearNum)) return;
    const cacheKey = `teams_${year}`;
    try {
      const cached =
        typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        const parsed = JSON.parse(cached) as ReturnType<typeof mapTeamToRow>[];
        setTeams(parsed);
        setLoading(false);
        return;
      }
      const data = await getTeams(yearNum);
      const rows = Array.isArray(data) ? data.map(mapTeamToRow) : [];
      setTeams(rows);
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(rows));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleRowClick = (row: { id: number }) => {
    if (year && row.id) {
      router.push(`/season/${year}/team/${row.id}`);
    }
  };

  if (!year) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Invalid season.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 text-center px-1">
        <h2 className="text-xl sm:text-2xl font-semibold">Season: {year}</h2>
      </div>
      <TeamsTable
        data={teams}
        season={year}
        onRowClick={handleRowClick}
      />
    </>
  );
}
