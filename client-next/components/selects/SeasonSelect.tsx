"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

type SeasonSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function SeasonSelect({ value, onValueChange }: SeasonSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[120px] border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700" aria-label="Select season">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent className="border-zinc-700 bg-zinc-800 text-zinc-100">
        {years.map((year) => (
          <SelectItem key={year} value={String(year)} className="focus:bg-zinc-700 focus:text-zinc-100">
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
