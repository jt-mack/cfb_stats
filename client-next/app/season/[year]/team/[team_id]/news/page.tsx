"use client";

import Image from "next/image";
import { useTeamPage } from "../TeamPageContext";
import { useTeamNews } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";

export default function TeamNewsPage() {
  const { year, team } = useTeamPage();
  const { data: articles = [], isLoading, isError } = useTeamNews(String(team.id), Number(year), 20);

  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load team news." />;
  if (!articles.length) {
    return <p className="py-8 text-center text-zinc-400">No team news available.</p>;
  }

  return (
    <div className="space-y-3">
      {articles.map((a) => (
        <a
          key={a.id}
          href={a.link ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 rounded-md border border-zinc-700 bg-zinc-800 p-3 hover:bg-zinc-700"
        >
          {a.imageUrl && (
            <Image
              src={a.imageUrl}
              alt=""
              width={96}
              height={54}
              className="rounded object-cover shrink-0 hidden sm:block"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-zinc-100">{a.headline}</h2>
            {a.description && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{a.description}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}
