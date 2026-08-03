import WeekPageClient from "./WeekPageClient";

type PageProps = {
  params: Promise<{ year: string; week: string }>;
};

export default async function WeekPage({ params }: PageProps) {
  await params;
  return <WeekPageClient />;
}
