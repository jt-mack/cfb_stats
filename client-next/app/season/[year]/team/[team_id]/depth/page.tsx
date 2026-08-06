"use client";

import { useMemo } from "react";
import { useTeamPage } from "../TeamPageContext";
import { useDepthChart } from "@/lib/hooks/queries";
import { useActiveSeason } from "@/context/GlobalStateContext";
import { getFeatureAvailability } from "@/lib/activeSeasonFeatures";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { UnavailableFeature } from "@/components/UnavailableFeature";

export default function TeamDepthPage() {
  const { year, team } = useTeamPage();
  const seasonNum = Number(year);
  const activeSeason = useActiveSeason();
  const availability = getFeatureAvailability("depthChart", seasonNum, activeSeason);
  const { data, isLoading, isError } = useDepthChart(
    String(team.id),
    seasonNum,
    availability.enabled
  );

  const byUnit = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["players"]>();
    for (const p of data?.players ?? []) {
      const list = map.get(p.unit) ?? [];
      list.push(p);
      map.set(p.unit, list);
    }
    return map;
  }, [data]);

  if (!availability.enabled) {
    return <UnavailableFeature message={availability.reason ?? "Depth chart is unavailable."} />;
  }
  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load depth chart." />;
  if (!data?.available) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Depth chart is not available for this team right now.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {[...byUnit.entries()].map(([unit, players]) => (
        <div key={unit}>
          <h3 className="text-sm font-medium text-foreground/80 mb-2">{unit}</h3>
          <ul className="space-y-1 text-sm">
            {players
              .slice()
              .sort((a, b) => a.position.localeCompare(b.position) || a.rank - b.rank)
              .map((p) => (
                <li key={`${p.athleteId}-${p.position}-${p.rank}`} className="text-foreground">
                  <span className="text-muted-foreground w-8 inline-block">#{p.rank}</span>
                  {p.jersey ? `#${p.jersey} ` : ""}
                  {p.name}{" "}
                  <span className="text-muted-foreground">({p.position})</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
