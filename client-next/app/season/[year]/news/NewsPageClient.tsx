"use client";

import Image from "next/image";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useNews } from "@/lib/hooks/queries";
import { useActiveSeason } from "@/context/GlobalStateContext";
import { getFeatureAvailability } from "@/lib/activeSeasonFeatures";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { UnavailableFeature } from "@/components/UnavailableFeature";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function NewsPageClient() {
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const activeSeason = useActiveSeason();
  const availability = getFeatureAvailability("news", seasonNum, activeSeason);
  const { data: articles = [], isLoading, isError } = useNews(30, availability.enabled);

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;
  if (!availability.enabled) {
    return (
      <div className="space-y-4 min-w-0">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-foreground">College Football News</h1>
        </div>
        <UnavailableFeature message={availability.reason ?? "News is unavailable."} />
      </div>
    );
  }
  if (isLoading) return <PageSpinner heightClass="h-[40vh]" />;
  if (isError) return <PageError message="Failed to load news." />;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-foreground">College Football News</h1>
        <p className="text-sm text-muted-foreground">
          Headlines from ESPN. Articles open on the source site.
        </p>
      </div>
      <div className="space-y-3">
        {articles.map((a) => (
          <a key={a.id} href={a.link ?? undefined} target="_blank" rel="noopener noreferrer">
            <Card className="gap-0 py-0 hover:bg-accent/50 transition-colors">
              <CardContent className="flex gap-3 p-3">
                {a.imageUrl && (
                  <Image
                    src={a.imageUrl}
                    alt=""
                    width={120}
                    height={68}
                    className="rounded object-cover shrink-0 hidden sm:block"
                    unoptimized
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-foreground">{a.headline}</h2>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-2">
                    <span>
                      {a.published ? new Date(a.published).toLocaleString("en-US") : ""}
                      {a.byline ? ` · ${a.byline}` : ""}
                    </span>
                    {a.premium ? <Badge variant="secondary">Premium</Badge> : null}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
        {!articles.length && (
          <p className="text-center text-muted-foreground">No articles available.</p>
        )}
      </div>
    </div>
  );
}
