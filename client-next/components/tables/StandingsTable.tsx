"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StandingsRow = {
  id: number;
  name: string;
  logo: string;
  record: string;
  conferenceRecord: string;
};

type StandingsTableProps = {
  standings: StandingsRow[];
  activeTeamId?: string | number;
  activeTeamStyle?: { color?: string; backgroundColor?: string };
  season: string;
};

export function StandingsTable({
  standings,
  activeTeamId,
  activeTeamStyle = {},
  season,
}: StandingsTableProps) {
  const router = useRouter();
  const activeId = activeTeamId != null ? String(activeTeamId) : null;

  return (
    <div className="rounded-md border border-zinc-700 overflow-x-auto -mx-3 sm:mx-0">
      <Table className="min-w-[320px]">
        <TableHeader>
          <TableRow className="border-zinc-700 hover:bg-transparent">
            <TableHead className="text-zinc-300 w-8 sm:w-10 text-xs sm:text-sm py-2 sm:py-3">#</TableHead>
            <TableHead className="text-zinc-300 w-10 sm:w-12 text-xs sm:text-sm py-2 sm:py-3"></TableHead>
            <TableHead className="text-zinc-300 text-xs sm:text-sm py-2 sm:py-3">Team</TableHead>
            <TableHead className="text-zinc-300 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Conf</TableHead>
            <TableHead className="text-zinc-300 text-xs sm:text-sm py-2 sm:py-3">Overall</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings?.map((row, index) => {
            const isActive = activeId !== null && String(row.id) === activeId;
            return (
              <TableRow
                key={row.id}
                className={`border-zinc-700 cursor-pointer hover:bg-zinc-800 active:bg-zinc-700 ${
                  isActive ? "bg-sky-500/20" : ""
                }`}
                style={isActive ? activeTeamStyle : undefined}
                onClick={() => router.push(`/season/${season}/team/${row.id}`)}
              >
                <TableCell className="w-8 sm:w-10 text-zinc-400 text-xs sm:text-sm py-2 sm:py-3">
                  {index + 1}
                </TableCell>
                <TableCell className="w-10 sm:w-12 py-2 sm:py-3">
                  {row.logo ? (
                    <Image
                      src={row.logo}
                      alt={row.name}
                      width={28}
                      height={28}
                      className="object-contain w-6 h-6 sm:w-7 sm:h-7"
                      unoptimized
                    />
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-zinc-100 text-sm sm:text-base py-2 sm:py-3 min-w-0">
                  {row.name}
                </TableCell>
                <TableCell className="text-zinc-400 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                  {row.conferenceRecord}
                </TableCell>
                <TableCell className="text-zinc-400 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">{row.record}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
