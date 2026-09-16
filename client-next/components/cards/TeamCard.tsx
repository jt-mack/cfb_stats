"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart } from "lucide-react";
import { contrastText, withAlpha, type TeamStyle } from "@/lib/teamColors";

type TeamCardProps = {
  id: number;
  title: string;
  record: string;
  rank?: number | null;
  coachName?: string | null;
  standingSummary?: string | null;
  standingHref?: string | null;
  logo: string;
  conferenceLogo?: string | null;
  favorite?: { id: number; name: string } | false;
  onToggleFavorite: () => void;
  links?: { href: string; text: string }[];
  customStyle?: TeamStyle;
  ratingChip?: string | null;
  atsChip?: string | null;
  children: React.ReactNode;
};

export function TeamCard({
  title,
  record,
  rank,
  coachName,
  standingSummary,
  standingHref,
  logo,
  conferenceLogo,
  favorite,
  onToggleFavorite,
  links = [],
  customStyle = {},
  ratingChip,
  atsChip,
  children,
}: TeamCardProps) {
  const primary = customStyle.color ?? "#18181b";
  const secondary = customStyle.backgroundColor ?? "#a1a1aa";
  const onPrimary = contrastText(primary);

  return (
    <Card className="mb-4 border-0 overflow-hidden bg-card text-card-foreground shadow-lg">
      <CardHeader
        className="py-3 px-3 sm:px-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-wrap border-b"
        style={{
          backgroundColor: primary,
          color: onPrimary,
          borderBottomColor: withAlpha(secondary, 0.5),
        }}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-0 sm:flex-1 justify-center sm:justify-start order-1">
          {logo ? (
            <Image
              src={logo}
              alt={title}
              width={40}
              height={40}
              className="object-contain shrink-0 w-10 h-10 sm:w-12 sm:h-12 drop-shadow"
              unoptimized
            />
          ) : null}
          <div className="min-w-0 text-center sm:text-left">
            <h2
              className="text-base sm:text-lg font-semibold truncate"
              style={{ color: onPrimary }}
            >
              {rank != null && rank > 0 ? (
                <span className="font-normal opacity-80 mr-1.5">#{rank}</span>
              ) : null}
              {title}{" "}
              <span className="font-normal opacity-80">({record})</span>
              {ratingChip && (
                <span
                  className="ml-2 text-xs font-normal px-2 py-0.5 rounded align-middle"
                  style={{
                    backgroundColor: withAlpha(secondary, 0.85),
                    color: contrastText(secondary),
                  }}
                >
                  {ratingChip}
                </span>
              )}
              {atsChip && (
                <span className="ml-1 text-xs font-normal opacity-75">{atsChip}</span>
              )}
            </h2>
            {(coachName || standingSummary) && (
              <p className="mt-0.5 text-xs sm:text-sm opacity-90 truncate">
                {coachName}
                {coachName && standingSummary ? (
                  <span className="opacity-60"> · </span>
                ) : null}
                {standingSummary && standingHref ? (
                  <Link href={standingHref} className="underline-offset-2 hover:underline">
                    {standingSummary}
                  </Link>
                ) : (
                  standingSummary
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 order-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm border-2 hover:opacity-90"
                style={{
                  borderColor: secondary,
                  backgroundColor: withAlpha(secondary, 0.25),
                  color: onPrimary,
                }}
              >
                Team Links
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {links.map((link, i) => (
                <DropdownMenuItem key={i} asChild>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.text}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {favorite && typeof favorite === "object" && favorite.id ? (
            <Button
              variant="secondary"
              size="icon"
              className="size-8 sm:size-9 hover:opacity-90"
              style={{ backgroundColor: withAlpha(secondary, 0.35) }}
              onClick={onToggleFavorite}
              aria-label="Remove from favorites"
            >
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="size-8 sm:size-9 border-2 hover:opacity-90"
              style={{
                borderColor: secondary,
                color: onPrimary,
                backgroundColor: withAlpha(secondary, 0.15),
              }}
              onClick={onToggleFavorite}
              aria-label="Add to favorites"
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 px-3 sm:px-6 bg-card text-card-foreground overflow-x-hidden">
        {conferenceLogo ? (
          <div className="flex justify-center pb-2">
            <Image
              src={conferenceLogo}
              alt=""
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
