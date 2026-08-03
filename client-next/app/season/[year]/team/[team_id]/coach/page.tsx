"use client";

import { Coach } from "@/components/views/Coach";
import { useTeamPage } from "../TeamPageContext";

export default function TeamCoachPage() {
  const { team, year } = useTeamPage();
  return <Coach teamId={String(team.id)} season={year} />;
}
