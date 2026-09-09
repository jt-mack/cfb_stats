"use client";

import { createContext, useContext } from "react";
import type { Conference, GameWithOdds, Team, TeamRecords } from "@/lib/types";
import type { TeamStyle } from "@/lib/teamColors";

export type TeamPageContextValue = {
  year: string;
  team: Team;
  conference: Conference | undefined;
  style: TeamStyle;
  schedule: GameWithOdds[];
  standings: TeamRecords[] | undefined;
  nextGame: GameWithOdds | null;
  recordStr: string;
};

const TeamPageContext = createContext<TeamPageContextValue | null>(null);

export function TeamPageProvider({
  value,
  children,
}: {
  value: TeamPageContextValue;
  children: React.ReactNode;
}) {
  return <TeamPageContext.Provider value={value}>{children}</TeamPageContext.Provider>;
}

export function useTeamPage() {
  const ctx = useContext(TeamPageContext);
  if (!ctx) {
    throw new Error("useTeamPage must be used within TeamPageProvider");
  }
  return ctx;
}

export const TEAM_TABS: ReadonlyArray<{
  slug: TeamTabSlug;
  label: string;
}> = [
  { slug: "overview", label: "Overview" },
  { slug: "schedule", label: "Schedule" },
  { slug: "leaders", label: "Leaders" },
  { slug: "roster", label: "Roster" },
  { slug: "coach", label: "Coach" },
  // { slug: "recruiting", label: "Recruiting" },
  { slug: "standings", label: "Standings" },
  { slug: "news", label: "News" },
];

export type TeamTabSlug =
  | "overview"
  | "schedule"
  | "leaders"
  | "roster"
  | "coach"
  | "recruiting"
  | "standings"
  | "news";
