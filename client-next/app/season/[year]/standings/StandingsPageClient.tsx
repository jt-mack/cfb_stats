"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useConferences, useFbsStandings, useStandings, useTeams } from "@/lib/hooks/queries";
import { StandingsTable } from "@/components/tables/StandingsTable";
import type { StandingsRow } from "@/components/tables/StandingsTable";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";

export default function StandingsPageClient() {
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data: conferences = [] } = useConferences();
  const { data: teams = [] } = useTeams(seasonNum);
  const [view, setView] = useState<"conference" | "fbs">("conference");
  const fbsConfs = useMemo(
    () => conferences.filter((c) => c.classification === "fbs" && c.id !== 80),
    [conferences]
  );
  const [confId, setConfId] = useState<string>("8");

  const { data: confRecords = [], isLoading: confLoading, isError: confError } = useStandings(
    view === "conference" ? confId : undefined,
    seasonNum
  );
  const { data: fbsRecords = [], isLoading: fbsLoading, isError: fbsError } = useFbsStandings(
    view === "fbs" ? seasonNum : undefined
  );

  const logoById = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teams) {
      if (t.id && t.logos?.[0]) map.set(t.id, t.logos[0]);
    }
    return map;
  }, [teams]);

  const records = view === "fbs" ? fbsRecords : confRecords;
  const standings: StandingsRow[] = records.map((rec) => ({
    name: rec.team,
    id: rec.teamId,
    logo: logoById.get(rec.teamId) ?? "",
    record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : "—",
    conferenceRecord: rec.conferenceGames
      ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}`
      : "—",
  }));

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;

  const loading = view === "fbs" ? fbsLoading : confLoading;
  const error = view === "fbs" ? fbsError : confError;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-zinc-100">{year} Standings</h1>
        <p className="text-sm text-zinc-400">
          {view === "fbs"
            ? "FBS record listing — not an official national ranking."
            : "Conference standings by overall and conference record."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center items-center">
        <div className="flex rounded-md border border-zinc-700 overflow-hidden">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm ${view === "conference" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400"}`}
            onClick={() => setView("conference")}
          >
            Conference
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm ${view === "fbs" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400"}`}
            onClick={() => setView("fbs")}
          >
            FBS listing
          </button>
        </div>
        {view === "conference" && (
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
            value={confId}
            onChange={(e) => setConfId(e.target.value)}
          >
            {fbsConfs.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {view === "conference" && (
          <Link
            href={`/season/${year}/conference/${confId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Conference page →
          </Link>
        )}
      </div>

      {loading ? (
        <PageSpinner heightClass="h-[40vh]" />
      ) : error ? (
        <PageError message="Failed to load standings." />
      ) : (
        <StandingsTable standings={standings} season={year} />
      )}
    </div>
  );
}
