"use client";

import { useMemo } from "react";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useSchedule, useScheduleEnrichment } from "@/lib/hooks/queries";
import { Schedule } from "@/components/tables/Schedule";
import { useTeamPage } from "../TeamPageContext";

export default function TeamScheduleTab() {
  const { seasonNum } = useSeasonParams();
  const { year, team, conference, style } = useTeamPage();
  const { data: schedule = [] } = useSchedule(team.school, seasonNum);
  const { data: enrichment = [] } = useScheduleEnrichment(team.school, seasonNum, Boolean(team.school));

  const enrichmentMap = useMemo(() => {
    const map = new Map<number, (typeof enrichment)[number]>();
    for (const e of enrichment) map.set(e.gameId, e);
    return map;
  }, [enrichment]);

  return (
    <Schedule
      schedule={schedule}
      team={team}
      conference={conference ?? null}
      style={style}
      season={year}
      enrichmentByGameId={enrichmentMap}
    />
  );
}
