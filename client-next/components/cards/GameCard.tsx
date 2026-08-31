"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Game } from "@/lib/types";
import Link from "next/link";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { Button } from "@/components/ui/button";

export function GameCard({ game, year }: { game: Game; year: number }) {
    const venue = game.venue;
    return (
        <Card className="overflow-hidden gap-0 py-0">
            {venue?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full object-cover h-60"
                />
            ) : (
                <div className="h-40 bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">{venue?.name ?? "—"}</span>
                </div>
            )}
            <CardContent className="p-4">
                <div className="text-center">
                    <Button variant="link" size="sm" asChild>
                        <Link href={`/season/${year}`}>← Back to season</Link>
                    </Button>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-2">
                        Week {game.week}:{" "}
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
                </div>
            </CardContent>
        </Card>
    );
}
