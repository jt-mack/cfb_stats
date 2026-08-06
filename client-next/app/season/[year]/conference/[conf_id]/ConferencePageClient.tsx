"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useConferences, useStandings, useConferenceTeams } from "@/lib/hooks/queries";
import { StandingsTable } from "@/components/tables/StandingsTable";
import type { StandingsRow } from "@/components/tables/StandingsTable";
import { Card, CardContent } from "@/components/ui/card";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { Button } from "@/components/ui/button";

export default function ConferencePageClient() {
  const router = useRouter();
  const { year, confId, seasonNum, isValidSeason } = useSeasonParams();
  const { data: conferences = [] } = useConferences();
  const { data: records = [], isLoading: standingsLoading, isError } = useStandings(confId, seasonNum);
  const { data: confTeams = [], isLoading: teamsLoading } = useConferenceTeams(confId, seasonNum);

  const conf = conferences.find((c) => String(c.id) === confId);
  const loading = standingsLoading || teamsLoading;

  const logoById = new Map<number, string>();
  for (const t of confTeams) {
    if (t.id && t.logos?.[0]) logoById.set(t.id, t.logos[0]);
  }

  const standings: StandingsRow[] = records.map((rec) => ({
    name: rec.team,
    id: rec.teamId,
    logo: logoById.get(rec.teamId) ?? "",
    record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : "—",
    conferenceRecord: rec.conferenceGames
      ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}`
      : "—",
  }));

  if (!year || !confId || !isValidSeason) {
    return <PageError message="Invalid route." />;
  }

  if (loading) return <PageSpinner heightClass="h-[50vh]" />;
  if (isError) return <PageError message="Failed to load conference data." />;

  return (
    <div className="space-y-6 min-w-0">
      <div className="text-center">
        <Button variant="link" size="sm" asChild>
          <Link href={`/season/${year}`}>← Back to season</Link>
        </Button>
        <h1 className="text-xl font-semibold text-foreground mt-2">{conf?.name ?? confId}</h1>
      </div>
      <StandingsTable standings={standings} season={year} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {confTeams.map((t) => (
          <Card
            key={t.id}
            className="cursor-pointer hover:bg-accent gap-0 py-0"
            onClick={() => router.push(`/season/${year}/team/${t.id}`)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              {t.logos?.[0] && (
                <Image src={t.logos[0]} alt="" width={32} height={32} className="object-contain" unoptimized />
              )}
              <span className="text-sm text-foreground truncate">
                {t.mascot ? `${t.school} ${t.mascot}` : t.school}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
