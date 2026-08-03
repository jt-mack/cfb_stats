import ConferencePageClient from "./ConferencePageClient";

type PageProps = {
  params: Promise<{ year: string; conf_id: string }>;
};

export default async function ConferencePage({ params }: PageProps) {
  await params;
  return <ConferencePageClient />;
}
