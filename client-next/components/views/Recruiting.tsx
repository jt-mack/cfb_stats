"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTeamRecruiting } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";

type RecruitingProps = {
  teamSchool: string;
  season: string;
};

export function Recruiting({ teamSchool, season }: RecruitingProps) {
  const seasonNum = Number(season);
  const { data, isLoading, isError } = useTeamRecruiting(teamSchool, seasonNum);

  if (isLoading) return <PageSpinner heightClass="h-[20vh]" />;
  if (isError || !data) {
    return <PageError message="Recruiting data not available." />;
  }

  const recruiting = data.recruiting?.[0];
  const talent = data.talent;

  const recruitingLabel =
    recruiting?.source === "247sports" ? "Recruiting Class Rank" : "FPI Estimate (Rank)";
  const talentLabel =
    talent?.source === "247sports" ? "Team Talent Composite" : "ESPN FPI";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recruiting && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <h4 className="text-sm text-muted-foreground">{recruitingLabel}</h4>
            <p className="text-2xl font-semibold text-foreground">#{recruiting.rank}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {recruiting.source === "247sports" ? "247Sports" : "ESPN FPI estimate"}:{" "}
              {recruiting.points?.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      )}
      {talent && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <h4 className="text-sm text-muted-foreground">{talentLabel}</h4>
            <p className="text-2xl font-semibold text-foreground">{talent.talent?.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {talent.year} {talent.source === "247sports" ? "247Sports talent" : "ESPN FPI"}
            </p>
          </CardContent>
        </Card>
      )}
      {!recruiting && !talent && (
        <p className="text-muted-foreground col-span-full text-center py-4">No recruiting data available.</p>
      )}
    </div>
  );
}
