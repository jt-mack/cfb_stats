"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useTeamLeaders } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TeamLeadersPage() {
  const { year, team } = useTeamPage();
  const { data: leaders = [], isLoading, isError } = useTeamLeaders(String(team.id), Number(year));

  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load team leaders." />;
  if (!leaders.length) {
    return <p className="py-8 text-center text-zinc-400">Team leaders are not available for this season yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-700">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-700">
            <TableHead className="text-zinc-400">Category</TableHead>
            <TableHead className="text-zinc-400">Player</TableHead>
            <TableHead className="text-zinc-400">Pos</TableHead>
            <TableHead className="text-zinc-400 text-right">Stat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((l) => (
            <TableRow key={l.category} className="border-zinc-800">
              <TableCell className="text-zinc-300">{l.categoryDisplay}</TableCell>
              <TableCell className="text-zinc-100">{l.player}</TableCell>
              <TableCell className="text-zinc-400">{l.position ?? "—"}</TableCell>
              <TableCell className="text-right text-zinc-100">{l.displayValue}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-zinc-500 p-2">
        Derived from national season leaders for{" "}
        <Link href={`/season/${year}/stats`} className="underline hover:text-zinc-300">
          {leaders[0]?.season ?? year}
        </Link>
        .
      </p>
    </div>
  );
}
