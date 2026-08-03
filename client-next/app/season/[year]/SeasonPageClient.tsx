"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FbsTeamWithRank } from "@/lib/types";
import { TeamsTable } from "@/components/tables/TeamsTable";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useTeams, useSeasonContext, useConferences } from "@/lib/hooks/queries";
import { filterMainConferences } from "@/lib/helpers/conferences";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { ScoreboardStrip } from "@/components/views/ScoreboardStrip";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";
import { PreseasonBanner } from "@/components/ui/LineScoreTable";

function mapTeamToRow(team: FbsTeamWithRank) {
  return {
    id: team.id,
    name: team.mascot ? `${team.school} ${team.mascot}` : team.school,
    rank: team.rank ?? null,
    rankLabel: team.rankLabel ?? (team.rank ? `#${team.rank}` : "NR"),
    rankSource: team.rankSource ?? "none",
    logo: team.logos?.[0] ?? "",
  };
}

export default function SeasonPageClient() {
  const router = useRouter();
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data: seasonContext, isLoading: contextLoading } = useSeasonContext(seasonNum);
  const { data: teamsData, isLoading: teamsLoading, isError, error } = useTeams(seasonNum);
  const { data: conferences = [] } = useConferences();

  const mainConferences = filterMainConferences(conferences);
  const teams = Array.isArray(teamsData) ? teamsData.map(mapTeamToRow) : [];
  const loading = contextLoading || teamsLoading;

  const handleRowClick = (row: { id: number }) => {
    if (year && row.id) router.push(`/season/${year}/team/${row.id}`);
  };

  if (!year || !isValidSeason) {
    return <PageError message="Invalid season." />;
  }

  if (loading) return <PageSpinner heightClass="h-[70vh]" />;

  if (isError) {
    return <PageError message={error instanceof Error ? error.message : "Failed to load teams"} />;
  }

  return (
    <>
      <div className="mb-4 text-center px-1">
        <h2 className="text-xl sm:text-2xl font-semibold">Season: {year}</h2>
      </div>
      {seasonContext?.phase === "preseason" && (
        <div className="mb-4">
          <PreseasonBanner
            year={year}
            firstGameDate={seasonContext.firstGameDate}
            formatDate={formatSeasonDate}
          />
        </div>
      )}
      <ScoreboardStrip year={year} seasonContext={seasonContext ?? null} enabled={!loading} />
      {mainConferences.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 justify-center px-1">
          {mainConferences.map((c) => (
            <Link
              key={c.id}
              href={`/season/${year}/conference/${c.id}`}
              className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
            >
              {c.abbreviation ?? c.shortName ?? c.name}
            </Link>
          ))}
        </div>
      )}
      <TeamsTable
        data={teams}
        season={year}
        onRowClick={handleRowClick}
        rankSourceLabel={
          teams.some((t) => t.rankSource === "fpi")
            ? "FPI"
            : teams.some((t) => t.rankSource === "prior_ap")
              ? `${Number(year) - 1} Final`
              : seasonContext?.phase === "preseason"
                ? "Preseason"
                : undefined
        }
      />
    </>
  );
}
