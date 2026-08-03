import { redirect } from "next/navigation";
import { getDefaultSeason } from "@/lib/seasonHelpers";

export default function HomePage() {
  redirect(`/season/${getDefaultSeason()}`);
}
