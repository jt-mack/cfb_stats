"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 25;

export type TeamsTableRow = {
  id: number;
  name: string;
  rank: number;
  logo: string;
};

type TeamsTableProps = {
  data: TeamsTableRow[];
  season: string;
  onRowClick: (row: TeamsTableRow) => void;
};

export function TeamsTable({ data, season, onRowClick }: TeamsTableProps) {
  const [nameFilter, setNameFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!nameFilter.trim()) return data;
    const lower = nameFilter.toLowerCase();
    return data.filter((row) => row.name.toLowerCase().includes(lower));
  }, [data, nameFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageData = useMemo(
    () => filtered.slice(start, start + PAGE_SIZE),
    [filtered, start]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <Input
          type="search"
          placeholder="Filter by name..."
          value={nameFilter}
          onChange={(e) => {
            setNameFilter(e.target.value);
            setPage(0);
          }}
          className="w-full sm:max-w-xs bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 min-h-10"
        />
      </div>
      <div className="rounded-md border border-zinc-700 overflow-x-auto -mx-3 sm:mx-0">
        <Table className="min-w-[280px]">
          <TableHeader>
            <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
              <TableHead className="text-zinc-300 w-10 sm:w-12 text-xs sm:text-sm py-3">Logo</TableHead>
              <TableHead className="text-zinc-300 text-xs sm:text-sm py-3">Name</TableHead>
              <TableHead className="text-zinc-300 text-right w-16 sm:w-auto text-xs sm:text-sm py-3">Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer border-zinc-700 hover:bg-zinc-800 active:bg-zinc-700"
                onClick={() => onRowClick(row)}
              >
                <TableCell className="w-10 sm:w-12 py-2.5 sm:py-3">
                  {row.logo ? (
                    <Image
                      src={row.logo}
                      alt=""
                      width={28}
                      height={28}
                      className="object-contain max-h-7 w-6 h-6 sm:w-7 sm:h-7"
                      unoptimized
                    />
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm sm:text-base py-2.5 sm:py-3">{row.name}</TableCell>
                <TableCell className="text-right text-zinc-400 text-sm py-2.5 sm:py-3">
                  {row.rank === 0 ? "—" : row.rank}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-zinc-400 text-center sm:text-left">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 min-h-9 flex-1 sm:flex-initial"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 min-h-9 flex-1 sm:flex-initial"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
