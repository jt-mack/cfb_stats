import { Suspense } from "react";
import WeekPageClient from "./WeekPageClient";
import { PageSpinner } from "@/components/PageSpinner";

type PageProps = {
  params: Promise<{ year: string; week: string }>;
};

export default async function WeekPage({ params }: PageProps) {
  await params;
  return (
    <Suspense fallback={<PageSpinner heightClass="h-[40vh]" />}>
      <WeekPageClient />
    </Suspense>
  );
}
