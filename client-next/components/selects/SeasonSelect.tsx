"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDefaultSeason } from "@/lib/seasonHelpers";

const defaultYear = getDefaultSeason();
const years = Array.from({ length: 11 }, (_, i) => defaultYear - i);

type SeasonSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function SeasonSelect({ value, onValueChange }: SeasonSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[120px]" aria-label="Select season">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
