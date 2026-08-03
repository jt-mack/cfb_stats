"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { Conference, TeamRecords } from "@/lib/types";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useFavorites } from "@/lib/hooks/useFavorites";
import {
  useTeamInfo,
  useSeasonContext,
  useStandings,
  useTeamRatings,
  useConferences,
} from "@/lib/hooks/queries";
import { TeamCard } from "@/components/cards/TeamCard";
import { TeamDetails } from "@/components/views/TeamDetails";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";
import { PreseasonBanner } from "@/components/ui/LineScoreTable";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { cn } from "@/lib/utils";
import { TEAM_TABS, TeamPageProvider, type TeamTabSlug } from "./TeamPageContext";

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
  const suffix = pathname.slice(basePath.length).replace(/^\//, "");
  const match = TEAM_TABS.find((tab) => tab.slug === suffix);
  return match?.slug ?? "schedule";
}

type TeamLayoutClientProps = {
  children: React.ReactNode;
};

export default function TeamLayoutClient({ children }: TeamLayoutClientProps) {
  const pathname = usePathname();
  const { year, teamId, seasonNum, isValidSeason } = useSeasonParams();
  const { getFavorite, toggleFavorite } = useFavorites();

  const { data: team, isLoading: teamLoading, isError: teamError } = useTeamInfo(teamId, seasonNum);
  const { data: seasonContext } = useSeasonContext(seasonNum);
  const { data: conferences = [] } = useConferences();

  const conference = useMemo(
    () => (team?.conference ? resolveConference(team.conference, conferences) : undefined),
    [team?.conference, conferences]
  );

  const confAbbr = conference?.abbreviation ?? team?.conference ?? undefined;
  const { data: standings } = useStandings(confAbbr, seasonNum);
  const { data: ratings } = useTeamRatings(seasonNum, team?.school);

  const style = useMemo(() => {
    if (!team) return {};
    const rawColor = (team.color ?? "000000").toString().replace(/^#/, "");
    const rawAlt = (team.alternateColor ?? "ffffff").toString().replace(/^#/, "");
    return { color: `#${rawColor}`, backgroundColor: `#${rawAlt}` };
  }, [team]);

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
  const recordStr = standings
    ? (() => {
        const r = standings.find((rec: TeamRecords) => rec.teamId === team.id || rec.team === team.school);
        if (seasonContext?.phase === "preseason" && (!r?.total?.games || r.total.games === 0)) {
          return "0-0 (Preseason)";
        }
        return r?.total ? `${r.total.wins}-${r.total.losses}` : "0-0";
      })()
    : seasonContext?.phase === "preseason"
      ? "0-0 (Preseason)"
      : "0-0";

  const title = team.mascot ? `${team.school} ${team.mascot}` : team.school;
  const ratingChip = ratings?.fpi?.ranking
    ? `${ratings.fpi.label ?? "ESPN FPI"} #${ratings.fpi.ranking}`
    : ratings?.sp?.ranking
      ? `FPI #${ratings.sp.ranking}`
      : null;
  const atsChip =
    ratings?.ats?.games != null
      ? `${ratings.ats.covers}-${ratings.ats.games - ratings.ats.covers} ATS`
      : null;

  return (
    <div className="space-y-4 min-w-0">
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
        <TeamDetails team={team} conferenceName={conference?.name} />
        <nav
          aria-label="Team sections"
          className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-zinc-800 border border-zinc-700 text-zinc-300 gap-0.5 sm:gap-1 rounded-lg p-1"
        >
          {TEAM_TABS.map((tab) => {
            const isActive = activeTab === tab.slug;
            return (
              <Link
                key={tab.slug}
                href={`${basePath}/${tab.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
                  tab.wideOnMobile && "col-span-2 sm:col-span-1",
                  isActive ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-300 hover:text-zinc-100"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <TeamPageProvider value={{ year, team, conference, style }}>
          <div className="mt-4">{children}</div>
        </TeamPageProvider>
      </TeamCard>
    </div>
  );
}
