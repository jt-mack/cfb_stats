"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import type { Conference, GameWithOdds } from "@/lib/types";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useFavorites } from "@/lib/hooks/useFavorites";
import {
  useTeamInfo,
  useSeasonContext,
  useTeamRatings,
  useConferences,
  useSchedule,
} from "@/lib/hooks/queries";
import { TeamCard } from "@/components/cards/TeamCard";
import { TeamDetails } from "@/components/views/TeamDetails";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { PreseasonBanner } from "@/components/tables/LineScoreTable";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAM_TABS, TeamPageProvider, type TeamTabSlug } from "./TeamPageContext";
import { useActiveSeason } from "@/context/GlobalStateContext";
import { isFeatureEnabled } from "@/lib/activeSeasonFeatures";
import { teamCssVars, teamStyleFromColors, withAlpha } from "@/lib/teamColors";

function resolveConference(conferenceId: string, conferences: Conference[]): Conference | undefined {
  const normalized = conferenceId.toLowerCase();
  return conferences.find(
    (c) =>
      c.abbreviation?.toLowerCase() === normalized ||
      c.shortName?.toLowerCase() === normalized ||
      String(c.id) === String(conferenceId)
  );
}

function getActiveTab(pathname: string, basePath: string): TeamTabSlug {
  const suffix = pathname.slice(basePath.length).replace(/^\//, "").split("/")[0];
  const match = TEAM_TABS.find((tab) => tab.slug === suffix);
  return match?.slug ?? "overview";
}

function deriveNextGame(
  schedule: GameWithOdds[],
  nextEventId: number | null | undefined
): GameWithOdds | null {
  if (nextEventId != null) {
    const matched = schedule.find((g) => g.id === nextEventId);
    if (matched) return matched;
  }
  return schedule.find((g) => !g.completed) ?? null;
}

function coachDisplayName(team: { coach?: { firstName?: string; lastName?: string } | null }): string | null {
  const name = [team.coach?.firstName, team.coach?.lastName].filter(Boolean).join(" ");
  return name || null;
}

type TeamLayoutClientProps = {
  children: React.ReactNode;
};

export default function TeamLayoutClient({ children }: TeamLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { year, teamId, seasonNum, isValidSeason } = useSeasonParams();
  const { getFavorite, toggleFavorite } = useFavorites();

  const { data: team, isLoading: teamLoading, isError: teamError } = useTeamInfo(teamId, seasonNum);
  const { data: seasonContext } = useSeasonContext(seasonNum);
  const { data: conferences = [] } = useConferences();
  const activeSeason = useActiveSeason();

  const conference = useMemo(
    () => (team?.conference ? resolveConference(team.conference, conferences) : undefined)
      ?? (team?.conferenceGroupId ? resolveConference(team.conferenceGroupId, conferences) : undefined),
    [team?.conference, team?.conferenceGroupId, conferences]
  );

  const { data: ratings } = useTeamRatings(seasonNum, team?.school);
  const { data: schedule = [] } = useSchedule(team?.school, seasonNum);

  const style = useMemo(
    () => teamStyleFromColors(team?.color, team?.alternateColor),
    [team?.color, team?.alternateColor]
  );

  const cssVars = useMemo(() => teamCssVars(style), [style]);

  const nextGame = useMemo(
    () => deriveNextGame(schedule, team?.nextEvent?.id),
    [schedule, team?.nextEvent?.id]
  );

  const recordStr = useMemo(() => {
    if (team?.recordSummary) return team.recordSummary;
    return seasonContext?.phase === "preseason" ? "0-0 (Preseason)" : "0-0";
  }, [team?.recordSummary, seasonContext?.phase]);

  if (!year || !teamId || !isValidSeason) {
    return <PageError message="Invalid route." />;
  }

  if (teamLoading) return <PageSpinner heightClass="h-[70vh]" color={style.color} />;

  if (teamError || !team?.school) {
    return <PageError message="Team not found." />;
  }

  const basePath = `/season/${year}/team/${teamId}`;
  const activeTab = getActiveTab(pathname, basePath);
  const favorite = getFavorite(team.id);
  const title = team.mascot ? `${team.school} ${team.mascot}` : team.school;
  const ratingChip = ratings?.fpi?.ranking
    ? `${ratings.fpi.label ?? "ESPN FPI"} #${ratings.fpi.ranking}`
    : null;
  const atsChip =
    ratings?.ats?.games != null
      ? `${ratings.ats.covers}-${ratings.ats.games - ratings.ats.covers} ATS`
      : null;

  const visibleTabs = TEAM_TABS.filter((tab) => {
    if (tab.slug === "news") return isFeatureEnabled("teamNews", seasonNum, activeSeason);
    return true;
  });

  const confId = team.conferenceGroupId ?? (conference?.id != null ? String(conference.id) : null);
  const standingHref = confId
    ? `/season/${year}/conference/${confId}?team=${team.id}`
    : null;

  const primary = style.color ?? "#18181b";

  return (
    <div className="space-y-4 min-w-0" style={cssVars}>
      {seasonContext?.phase === "preseason" && (
        <PreseasonBanner
          year={year}
          firstGameDate={seasonContext.firstGameDate}
          formatDate={formatSeasonDate}
        />
      )}
      <TeamCard
        id={team.id}
        title={title}
        record={recordStr}
        rank={team.rank}
        coachName={coachDisplayName(team)}
        standingSummary={team.standingSummary}
        standingHref={standingHref}
        logo={team.logos?.[0] ?? ""}
        conferenceLogo={conference?.logo ?? null}
        favorite={favorite ?? false}
        onToggleFavorite={() =>
          toggleFavorite({ id: team.id, name: team.abbreviation ?? team.school })
        }
        links={team.links ?? []}
        customStyle={style}
        ratingChip={ratingChip}
        atsChip={atsChip}
      >
        <TeamDetails
          team={team}
          conferenceName={conference?.name}
          conferenceHref={standingHref}
        />
        <Tabs
          value={activeTab}
          onValueChange={(slug) => router.push(`${basePath}/${slug}`)}
          className="w-full gap-0"
        >
          <TabsList
            aria-label="Team sections"
            className={cn(
              "flex w-full h-auto justify-start gap-1 overflow-x-auto p-1",
              "sm:justify-between sm:overflow-visible"
            )}
            style={{
              backgroundColor: withAlpha(primary, 0.12),
              border: `1px solid ${withAlpha(primary, 0.35)}`,
            }}
          >
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.slug;
              return (
                <TabsTrigger
                  key={tab.slug}
                  value={tab.slug}
                  className={cn(
                    "flex-none whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm data-[state=active]:shadow-sm",
                    !isActive && "text-foreground/80 hover:text-foreground"
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: primary,
                          color: "var(--team-on-primary)",
                          boxShadow: `0 1px 2px ${withAlpha(primary, 0.4)}`,
                        }
                      : undefined
                  }
                >
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <TeamPageProvider
          value={{
            year,
            team,
            conference,
            style,
            schedule,
            nextGame,
            recordStr,
            standingHref,
          }}
        >
          <div className="mt-4">{children}</div>
        </TeamPageProvider>
      </TeamCard>
    </div>
  );
}
