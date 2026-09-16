"use client";

import Image from "next/image";
import type { Athlete } from "@/lib/types";
import { MapPin, Ruler, User } from "lucide-react";

type AthleteDetailsProps = {
  athlete: Athlete;
};

export function AthleteDetails({ athlete }: AthleteDetailsProps) {
  const size = [athlete.displayHeight, athlete.displayWeight].filter(Boolean).join(" · ");
  const classYear = athlete.experience;
  const hometown = athlete.birthPlace;
  const status = athlete.status;
  const hasBio = Boolean(hometown || size || classYear || status || athlete.flag);

  if (!hasBio) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-background/50 p-3 sm:p-4 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {hometown && (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground/80">Hometown</span>
            </div>
            <div className="text-foreground font-medium">{hometown}</div>
          </div>
        )}

        {size && (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Ruler className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground/80">Size</span>
            </div>
            <div className="text-foreground font-medium">{size}</div>
          </div>
        )}

        {(classYear || status) && (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground/80">Class</span>
            </div>
            <div className="text-foreground">
              {classYear && <span className="font-medium">{classYear}</span>}
              {classYear && status ? (
                <span className="text-muted-foreground"> · {status}</span>
              ) : null}
              {!classYear && status ? <span className="font-medium">{status}</span> : null}
            </div>
          </div>
        )}

        {athlete.flag && (
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={athlete.flag}
              alt={athlete.birthCountry ?? ""}
              width={28}
              height={28}
              className="object-contain w-7 h-7"
              unoptimized
            />
            {athlete.birthCountry ? (
              <span className="text-muted-foreground">{athlete.birthCountry}</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
