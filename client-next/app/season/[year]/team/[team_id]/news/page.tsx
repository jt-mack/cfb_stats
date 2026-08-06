"use client";

import Image from "next/image";
import { useTeamPage } from "../TeamPageContext";
import { useTeamNews } from "@/lib/hooks/queries";
import { useActiveSeason } from "@/context/GlobalStateContext";
import { getFeatureAvailability } from "@/lib/activeSeasonFeatures";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { UnavailableFeature } from "@/components/UnavailableFeature";

export default function TeamNewsPage() {
  const { year, team } = useTeamPage();
  const seasonNum = Number(year);
  const activeSeason = useActiveSeason();
  const availability = getFeatureAvailability("teamNews", seasonNum, activeSeason);
  const { data: articles = [], isLoading, isError } = useTeamNews(
    String(team.id),
    seasonNum,
    20,
    availability.enabled
  );

  if (!availability.enabled) {
    return <UnavailableFeature message={availability.reason ?? "Team news is unavailable."} />;
  }
  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load team news." />;
  if (!articles.length) {
    return <p className="py-8 text-center text-muted-foreground">No team news available.</p>;
  }

  return (
    <div className="space-y-3">
      {articles.map((a) => (
        <a
          key={a.id}
          href={a.link ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 rounded-md border border-border bg-card p-3 hover:bg-accent"
        >
          {a.imageUrl && (
            <Image
              src={a.imageUrl}
              alt=""
              width={96}
              height={54}
              className="rounded object-cover shrink-0 hidden sm:block"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">{a.headline}</h2>
            {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}
