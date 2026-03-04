"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  getTeamInfo,
  getStandings,
  getSchedule,
} from "@/lib/repos";
import type { Team, TeamRecords, Conference } from "@/lib/types";
import type { GameWithOdds } from "@/lib/types";
import { useGlobalState } from "@/context/GlobalStateContext";
import { TeamCard } from "@/components/cards/TeamCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Schedule } from "@/components/tables/Schedule";
import { StandingsTable } from "@/components/tables/StandingsTable";
import type { StandingsRow } from "@/components/tables/StandingsTable";
import { NextMatchup } from "@/components/views/NextMatchup";
import { Roster } from "@/components/views/Roster";
import { Coach } from "@/components/views/Coach";
import { TeamDetails } from "@/components/views/TeamDetails";
import { Skeleton } from "@/components/ui/skeleton";

function getFavorites(): { id: number; name: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("favorites");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function createStandingsProps(records: TeamRecords[]): StandingsRow[] {
  if (!Array.isArray(records)) return [];
  console.log({ records });
  return records.map((rec) => ({
    name: rec.team,
    id: rec.teamId,
    logo: "",
    record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : "—",
    conferenceRecord: rec.conferenceGames
      ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}`
      : "—",
  }));
}

export default function TeamPageClient() {
  const params = useParams();
  const year = params?.year as string | undefined;
  const teamId = params?.team_id as string | undefined;
  const { globalState } = useGlobalState();

  const [team, setTeam] = useState<Team | null>(null);
  const [conference, setConference] = useState<Conference | null>(null);
  const [standings, setStandings] = useState<TeamRecords[] | null>(null);
  const [schedule, setSchedule] = useState<GameWithOdds[]>([]);
  const [nextMatchup, setNextMatchup] = useState<GameWithOdds | null>(null);
  const [loading, setLoading] = useState(true);
  const [style, setStyle] = useState<{ color?: string; backgroundColor?: string }>({});
  const [favorite, setFavorite] = useState<{ id: number; name: string } | false>(false);
  const [tab, setTab] = useState("schedule");

  const seasonNum = year ? Number(year) : undefined;

  const loadStandings = useCallback(
    async (conferenceId: string) => {
      if (!seasonNum) return [];
      const matching = globalState.conferences?.find(
        (c) =>
          c.abbreviation === conferenceId ||
          c.shortName === conferenceId ||
          String(c.id) === String(conferenceId)
      );
      if (matching) setConference(matching);
      const abbr =
        matching?.abbreviation ?? conferenceId;
      return getStandings(abbr, seasonNum);
    },
    [seasonNum, globalState.conferences]
  );

  useEffect(() => {
    const favs = getFavorites();
    const found = teamId ? favs.find((f) => String(f.id) === String(teamId)) : null;
    setFavorite(found ?? false);
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !year) return;
    const cachedStyle =
      typeof window !== "undefined"
        ? localStorage.getItem(`team_style_${teamId}`)
        : null;
    if (cachedStyle) {
      try {
        setStyle(JSON.parse(cachedStyle));
      } catch {
        //
      }
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId || seasonNum == null || Number.isNaN(seasonNum)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getTeamInfo(teamId, seasonNum)
      .then(async (t) => {
        setTeam(t);
        const conferenceAbbr = t.conference;
        if (conferenceAbbr) {
          const data = await loadStandings(conferenceAbbr);
          setStandings(data);
        }
        const teamName = t.school;
        let scheduleList: GameWithOdds[] = [];
        if (teamName) {
          scheduleList = await getSchedule(teamName, seasonNum);
          setSchedule(scheduleList);
        }
        const now = new Date();
        const next = scheduleList.find(
          (g) => !g.completed && new Date(g.startDate) >= now
        );
        setNextMatchup(next ?? null);
        const rawColor = (t.color ?? "000000").toString().replace(/^#/, "");
        const rawAlt = (t.alternateColor ?? "ffffff").toString().replace(/^#/, "");
        const newStyle = {
          color: `#${rawColor}`,
          backgroundColor: `#${rawAlt}`,
        };
        setStyle(newStyle);
        if (typeof window !== "undefined") {
          localStorage.setItem(`team_style_${t.id}`, JSON.stringify(newStyle));
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teamId, seasonNum, loadStandings]);

  const makeFavorite = () => {
    if (!team) return;
    const favs = getFavorites();
    const exists = favs.find((f) => f.id === team.id);
    if (exists) {
      setFavorite(exists);
      return;
    }
    const entry = { name: team.abbreviation ?? team.school, id: team.id };
    favs.push(entry);
    localStorage.setItem("favorites", JSON.stringify(favs));
    setFavorite(entry);
  };

  if (!year || !teamId) {
    return (
      <div className="py-8 text-center text-zinc-400">Invalid route.</div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Skeleton
          className="h-12 w-12 rounded-full"
          style={{ backgroundColor: style.color ? `${style.color}40` : undefined }}
        />
      </div>
    );
  }

  if (!team?.school) {
    return (
      <div className="py-8 text-center text-zinc-400">
        Team not found.
      </div>
    );
  }

  const recordStr = standings
    ? (() => {
      const r = standings.find(
        (rec) => rec.teamId === team.id || rec.team === team.school
      );
      return r?.total ? `${r.total.wins}-${r.total.losses}` : "0-0";
    })()
    : "0-0";

  const title = team.mascot ? `${team.school} ${team.mascot}` : team.school;

  const teamSummary = {
    id: team.id,
    title,
    record: recordStr,
    logo: team.logos?.[0] ?? "",
    conferenceLogo: conference?.logo ?? null,
    favorite,
    makeFavorite,
    links: (team.links as { href: string; text: string }[] | undefined) ?? [],
    customStyle: style,
  };

  return (
    <div className="space-y-4 min-w-0">
      <TeamCard {...teamSummary}>
        <TeamDetails team={team} conferenceName={conference?.name} />
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 bg-zinc-800 border border-zinc-700 text-zinc-300 gap-0.5 p-0.5 sm:gap-1 sm:p-1">
            <TabsTrigger value="schedule" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-xs sm:text-sm py-2 px-2 sm:py-1.5">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="standings" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-xs sm:text-sm py-2 px-2 sm:py-1.5">
              Standings
            </TabsTrigger>
            <TabsTrigger value="next-matchup" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-xs sm:text-sm py-2 px-2 sm:py-1.5">
              Next Game
            </TabsTrigger>
            <TabsTrigger value="roster" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-xs sm:text-sm py-2 px-2 sm:py-1.5">
              Roster
            </TabsTrigger>
            <TabsTrigger value="coach" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-xs sm:text-sm py-2 px-2 sm:py-1.5">
              Coach
            </TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="mt-4">
            <Schedule
              schedule={schedule}
              conference={conference}
              team={team}
              style={style}
            />
          </TabsContent>
          <TabsContent value="standings" className="mt-4">
            {standings && (
              <StandingsTable
                standings={createStandingsProps(standings)}
                activeTeamId={teamId}
                activeTeamStyle={style}
                season={year}
              />
            )}
          </TabsContent>
          <TabsContent value="next-matchup" className="mt-4">
            {nextMatchup ? (
              <NextMatchup
                id={nextMatchup.id}
                name={nextMatchup.awayTeam && nextMatchup.homeTeam ? `${nextMatchup.awayTeam} @ ${nextMatchup.homeTeam}` : undefined}
                extraData={{ odds: nextMatchup.odds }}
              />
            ) : (
              <p className="text-zinc-400">
                This team is coming up on a bye week. Check back next week.
              </p>
            )}
          </TabsContent>
          <TabsContent value="roster" className="mt-4">
            <Roster id={team.id} season={year} />
          </TabsContent>
          <TabsContent value="coach" className="mt-4">
            <Coach
              teamId={teamId}
              teamSchool={team.school}
              season={year}
            />
          </TabsContent>
        </Tabs>
      </TeamCard>
    </div>
  );
}
