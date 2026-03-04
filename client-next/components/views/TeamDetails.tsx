"use client";

import type { Team, TeamLocation } from "@/lib/types";
import { MapPin, Building2, Users, Calendar, ExternalLink } from "lucide-react";

type TeamDetailsProps = {
  team: Team;
  conferenceName?: string | null;
};

/** Normalize location from API (camelCase or snake_case). */
function getLocation(team: Team): TeamLocation | null {
  const loc = team.location ?? (team as { location?: TeamLocation }).location;
  if (!loc || typeof loc !== "object") return null;
  return loc;
}

function formatCapacity(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pickLoc<T>(loc: TeamLocation | null, ...keys: (keyof TeamLocation | string)[]): T | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  for (const k of keys) {
    const v = (loc as Record<string, unknown>)[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

export function TeamDetails({ team, conferenceName }: TeamDetailsProps) {
  const loc = getLocation(team);
  const venueName = pickLoc<string>(loc, "name");
  const city = pickLoc<string>(loc, "city");
  const state = pickLoc<string>(loc, "state");
  const capacity = pickLoc<number>(loc, "capacity");
  const constructionYear = pickLoc<number>(loc, "constructionYear", "construction_year");
  const grass = pickLoc<boolean>(loc, "grass");
  const dome = pickLoc<boolean>(loc, "dome");

  const conference = conferenceName ?? team.conference;
  const division = team.division;
  const classification =
    team.classification ?? (team as { classification?: string }).classification;
  const twitter = team.twitter ?? (team as { twitter?: string }).twitter;

  const hasVenue =
    venueName || (city && state) || capacity != null || constructionYear != null || grass != null || dome != null;
  const hasConference = conference || division;
  const hasClassification = classification;
  const hasTwitter = twitter && String(twitter).trim().replace(/^@/, "");

  if (!hasVenue && !hasConference && !hasClassification && !hasTwitter) {
    return null;
  }

  const surface = [grass === true ? "Grass" : null, dome === true ? "Dome" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 sm:p-4 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {hasVenue && (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="font-medium text-zinc-300">Home venue</span>
            </div>
            <div className="text-zinc-100">
              {venueName && <span className="font-medium">{venueName}</span>}
              {(city || state) && (
                <span className="text-zinc-400">
                  {venueName ? " · " : ""}
                  {[city, state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500">
              {capacity != null && capacity > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {formatCapacity(capacity)} capacity
                </span>
              )}
              {constructionYear != null && constructionYear > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Est. {constructionYear}
                </span>
              )}
              {surface && (
                <span>{surface}</span>
              )}
            </div>
          </div>
        )}

        {(hasConference || hasClassification) && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="font-medium text-zinc-300">Conference</span>
            </div>
            <div className="text-zinc-100">
              {conference && division
                ? `${conference} · ${division}`
                : conference ?? division ?? ""}
              {hasClassification && (
                <span className="text-zinc-500">
                  {conference || division ? " · " : ""}
                  {classification}
                </span>
              )}
            </div>
          </div>
        )}

        {hasTwitter && (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-zinc-300">Follow</span>
            <a
              href={`https://twitter.com/${String(twitter).replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 w-fit"
            >
              @{String(twitter).replace(/^@/, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
