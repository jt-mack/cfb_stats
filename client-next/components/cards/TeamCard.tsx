"use client";

import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart } from "lucide-react";

type TeamCardProps = {
  id: number;
  title: string;
  record: string;
  logo: string;
  conferenceLogo?: string | null;
  favorite?: { id: number; name: string } | false;
  makeFavorite: (id: number) => void;
  links?: { href: string; text: string }[];
  customStyle?: { color?: string; backgroundColor?: string };
  children: React.ReactNode;
};

export function TeamCard({
  id,
  title,
  record,
  logo,
  conferenceLogo,
  favorite,
  makeFavorite,
  links = [],
  customStyle = {},
  children,
}: TeamCardProps) {
  return (
    <Card className="mb-4 border-0 overflow-hidden border-zinc-700 bg-zinc-800 text-zinc-100">
      <CardHeader
        className="py-3 px-3 sm:px-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-wrap"
        style={customStyle}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-0 sm:flex-1 justify-center sm:justify-start order-1">
          {logo ? (
            <Image
              src={logo}
              alt={title}
              width={40}
              height={40}
              className="object-contain shrink-0 w-10 h-10 sm:w-12 sm:h-12"
              unoptimized
            />
          ) : null}
          <h2 className="text-base sm:text-lg font-semibold text-center sm:text-left text-zinc-100 [text-shadow:0_0_2px_rgba(0,0,0,0.5)] truncate min-w-0">
            {title} <span className="text-zinc-400 font-normal">({record})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0 order-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-zinc-600 bg-zinc-700/50 text-zinc-100 hover:bg-zinc-600 text-xs sm:text-sm" style={customStyle}>
                Team Links
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-zinc-700 bg-zinc-800 text-zinc-100" align="end">
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
            <Button variant="secondary" size="icon" className="bg-zinc-700 text-red-400 hover:bg-zinc-600 size-8 sm:size-9">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 size-8 sm:size-9"
              onClick={() => makeFavorite(id)}
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 px-3 sm:px-6 bg-zinc-800 text-zinc-100 overflow-x-hidden">
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
