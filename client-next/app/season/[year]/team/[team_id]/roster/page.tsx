"use client";

import { Roster } from "@/components/views/Roster";
import { useTeamPage } from "../TeamPageContext";

export default function TeamRosterPage() {
  const { team, year } = useTeamPage();
  return <Roster teamId={String(team.id)} season={year} />;
}
