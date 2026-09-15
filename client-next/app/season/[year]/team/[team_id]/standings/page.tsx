"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeamPage } from "../TeamPageContext";

export default function TeamStandingsRedirect() {
  const router = useRouter();
  const { year, team, conference, standingHref } = useTeamPage();

  useEffect(() => {
    if (standingHref) {
      router.replace(standingHref);
      return;
    }
    const confId = team.conferenceGroupId ?? conference?.id;
    if (confId) {
      router.replace(`/season/${year}/conference/${confId}?team=${team.id}`);
      return;
    }
    router.replace(`/season/${year}/team/${team.id}/overview`);
  }, [conference?.id, router, standingHref, team.conferenceGroupId, team.id, year]);

  return null;
}
