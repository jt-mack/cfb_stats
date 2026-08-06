"use client";

import { Recruiting } from "@/components/views/Recruiting";
import { useTeamPage } from "../TeamPageContext";

export default function TeamRecruitingPage() {
  const { team, year } = useTeamPage();
  return <Recruiting teamSchool={team.school} season={year} />;
}
