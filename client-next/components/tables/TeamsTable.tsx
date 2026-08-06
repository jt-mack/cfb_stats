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
  rank: number | null;
  rankLabel?: string;
  rankSource?: string;
  logo: string;
};

type TeamsTableProps = {
  data: TeamsTableRow[];
  season: string;
  onRowClick: (row: TeamsTableRow) => void;
  rankSourceLabel?: string;
};

export function TeamsTable({
  data,
  season,
  onRowClick,
  rankSourceLabel,
}: TeamsTableProps) {
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
          className="w-full sm:max-w-xs bg-card border-border text-foreground placeholder:text-muted-foreground min-h-10"
        />
        {rankSourceLabel && (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            Rank source: {rankSourceLabel}
          </span>
        )}
      </div>
      <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
        <Table className="min-w-[280px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-accent/50">
              <TableHead className="text-foreground/80 w-10 sm:w-12 text-xs sm:text-sm py-3">Logo</TableHead>
              <TableHead className="text-foreground/80 text-xs sm:text-sm py-3">Name</TableHead>
              <TableHead className="text-foreground/80 text-right w-16 sm:w-auto text-xs sm:text-sm py-3">Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer border-border hover:bg-accent active:bg-muted"
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
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm sm:text-base py-2.5 sm:py-3">{row.name}</TableCell>
                <TableCell
                  className="text-right text-muted-foreground text-sm py-2.5 sm:py-3"
                  title={row.rankLabel}
                >
                  {row.rank != null && row.rank > 0 ? row.rank : "NR"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="border-input text-foreground/80 hover:bg-accent min-h-9 flex-1 sm:flex-initial"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="border-input text-foreground/80 hover:bg-accent min-h-9 flex-1 sm:flex-initial"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
