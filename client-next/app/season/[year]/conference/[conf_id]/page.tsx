import ConferencePageClient from "./ConferencePageClient";

type PageProps = {
  params: Promise<{ year: string; conf_id: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function ConferencePage({ params, searchParams }: PageProps) {
  await params;
  const { team } = await searchParams;
  return <ConferencePageClient highlightTeamId={team} />;
}
