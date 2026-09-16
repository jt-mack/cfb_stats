import AthletePageClient from "./AthletePageClient";

type PageProps = {
  params: Promise<{ year: string; athlete_id: string }>;
};

export default async function AthletePage({ params }: PageProps) {
  const { year, athlete_id } = await params;
  return <AthletePageClient year={year} athleteId={athlete_id} />;
}
