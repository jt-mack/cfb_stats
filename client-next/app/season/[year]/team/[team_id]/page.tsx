import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ year: string; team_id: string }>;
};

export default async function TeamPage({ params }: PageProps) {
  const { year, team_id } = await params;
  redirect(`/season/${year}/team/${team_id}/schedule`);
}
