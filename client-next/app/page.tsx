import { redirect } from "next/navigation";

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  redirect(`/season/${currentYear}`);
}
