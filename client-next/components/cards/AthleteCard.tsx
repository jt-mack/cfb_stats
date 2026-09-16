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

type AthleteCardProps = {
  title: string;
  subtitle?: string | null;
  headshot?: string | null;
  links?: { href: string; text: string }[];
  children: React.ReactNode;
};

export function AthleteCard({
  title,
  subtitle,
  headshot,
  links = [],
  children,
}: AthleteCardProps) {
  return (
    <Card className="mb-4 border-0 overflow-hidden bg-card text-card-foreground shadow-lg">
      <CardHeader className="py-3 px-3 sm:px-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-wrap border-b">
        <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-0 sm:flex-1 justify-center sm:justify-start order-1">
          {headshot ? (
            <Image
              src={headshot}
              alt={title}
              width={72}
              height={72}
              className="object-cover shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-md bg-muted"
              unoptimized
            />
          ) : null}
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {links.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 order-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  Player Links
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
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2 px-3 sm:px-6 bg-card text-card-foreground overflow-x-hidden">
        {children}
      </CardContent>
    </Card>
  );
}
