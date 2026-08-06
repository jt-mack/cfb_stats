"use client";

import { useMemo } from "react";
import type { TeamRecords } from "@/lib/types";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useConferenceTeams } from "@/lib/hooks/queries";
import { StandingsTable } from "@/components/tables/StandingsTable";
import type { StandingsRow } from "@/components/tables/StandingsTable";
import { useTeamPage } from "../TeamPageContext";

function createStandingsProps(
  records: TeamRecords[],
  logoByTeamId: Map<number, string>
): StandingsRow[] {
  if (!Array.isArray(records)) return [];
  return records.map((rec) => ({
    name: rec.team,
    id: rec.teamId,
    logo: logoByTeamId.get(rec.teamId) ?? "",
    record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : "—",
    conferenceRecord: rec.conferenceGames
      ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}`
      : "—",
  }));
}

export default function TeamStandingsTab() {
  const { year, team, conference, style, standings } = useTeamPage();
  const { seasonNum } = useSeasonParams();
  const confAbbr = conference?.abbreviation ?? team.conference ?? undefined;
  const { data: confTeams = [] } = useConferenceTeams(confAbbr, seasonNum);

  const conferenceLogos = useMemo(() => {
    const logos = new Map<number, string>();
    for (const ct of confTeams) {
      if (ct.id && ct.logos?.[0]) logos.set(ct.id, ct.logos[0]);
    }
    return logos;
  }, [confTeams]);

  if (!standings) return null;

  return (
    <StandingsTable
      standings={createStandingsProps(standings, conferenceLogos)}
      activeTeamId={String(team.id)}
      activeTeamStyle={style}
      season={year}
    />
  );
}
