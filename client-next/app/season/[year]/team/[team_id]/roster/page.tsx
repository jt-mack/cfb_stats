"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeamPage } from "../TeamPageContext";

export default function TeamRosterRedirect() {
  const router = useRouter();
  const { year, team } = useTeamPage();

  useEffect(() => {
    router.replace(`/season/${year}/team/${team.id}/overview`);
  }, [router, team.id, year]);

  return null;
}
