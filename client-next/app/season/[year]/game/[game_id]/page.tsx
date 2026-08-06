import GamePageClient from "./GamePageClient";

type PageProps = {
  params: Promise<{ year: string; game_id: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { year, game_id } = await params;
  return <GamePageClient year={year} gameId={game_id} />;
}
