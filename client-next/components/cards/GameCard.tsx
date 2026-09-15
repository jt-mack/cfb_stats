"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Game, GamePreview } from "@/lib/types";
import Link from "next/link";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { Button } from "@/components/ui/button";

type GameCardProps = {
  game: Game;
  year: number;
  mediaOutlets?: string[];
  weather?: GamePreview["weather"];
};

export function GameCard({ game, year, mediaOutlets = [], weather }: GameCardProps) {
    const venue = game.venue;
    const showMedia = mediaOutlets.length > 0 && !game.completed;
    const showWeather = Boolean(weather && !weather.gameIndoors);
    return (
        <Card className="overflow-hidden gap-0 py-0">
            {venue?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full object-cover h-40 sm:h-60"
                />
            ) : (
                <div className="h-28 sm:h-40 bg-muted flex items-center justify-center px-3">
                    <span className="text-muted-foreground text-sm text-center">{venue?.name ?? "—"}</span>
                </div>
            )}
            <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                    <Button variant="link" size="sm" asChild>
                        <Link href={`/season/${year}`}>← Back to season</Link>
                    </Button>
                    <h1 className="text-lg sm:text-2xl font-semibold text-foreground mt-2 text-balance">

                        {game.awayTeamId != null ? (
                            <Link
                                href={`/season/${year}/team/${game.awayTeamId}/overview`}
                                className="hover:underline underline-offset-2"
                            >
                                {game.awayTeam}
                            </Link>
                        ) : (
                            game.awayTeam
                        )}
                        {" @ "}
                        {game.homeTeamId != null ? (
                            <Link
                                href={`/season/${year}/team/${game.homeTeamId}/overview`}
                                className="hover:underline underline-offset-2"
                            >
                                {game.homeTeam}
                            </Link>
                        ) : (
                            game.homeTeam
                        )}
                    </h1>
                    {game.startDate && (
                        <p className="text-sm text-muted-foreground">{formatSeasonDate(game.startDate)}</p>
                    )}
                    <h3 className="font-semibold text-lg">{venue?.name}</h3>
                    {venue?.address?.city && venue?.address?.state ? (
                        <p className="text-sm text-foreground/80 mt-1">
                            {venue.address.city}, {venue.address.state}
                        </p>
                    ) : null}
                    {showMedia && (
                        <p className="mt-2 text-sm text-foreground/80">
                            Watch on: {mediaOutlets.join(", ")}
                        </p>
                    )}
                    {showWeather && weather && (
                        <p className="mt-1 text-sm text-foreground/80">
                            {weather.condition?.description ?? "Weather forecast"}
                            {weather.temperature != null &&
                              !weather.condition?.description?.includes(`${weather.temperature}`) &&
                              ` · ${weather.temperature}°F`}
                            {weather.windSpeed != null && ` · Wind ${weather.windSpeed} mph`}
                            {weather.precipitation != null && weather.precipitation > 0 && ` · Precip ${weather.precipitation}%`}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
