"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useTeamLeaders } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";
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
    return <p className="py-8 text-center text-muted-foreground">Team leaders are not available for this season yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">Category</TableHead>
            <TableHead className="text-muted-foreground">Player</TableHead>
            <TableHead className="text-muted-foreground">Pos</TableHead>
            <TableHead className="text-muted-foreground text-right">Stat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((l) => (
            <TableRow key={l.category} className="border-border">
              <TableCell className="text-foreground/80">{l.categoryDisplay}</TableCell>
              <TableCell className="text-foreground">{l.player}</TableCell>
              <TableCell className="text-muted-foreground">{l.position ?? "—"}</TableCell>
              <TableCell className="text-right text-foreground">{l.displayValue}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground p-2">
        Derived from national season leaders for{" "}
        <Link href={`/season/${year}/stats`} className="underline hover:text-foreground">
          {leaders[0]?.season ?? year}
        </Link>
        .
      </p>
    </div>
  );
}
