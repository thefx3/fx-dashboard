import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShellNext";
import { getViewerServer } from "@/lib/auth/viewer.server";
import { getTodayIsoDate } from "@/lib/date";

export default async function DashboardJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { unavailable, user } = await getViewerServer();
  if (!user && !unavailable) redirect("/dashboard/login");

  const { date } = await searchParams;
  const journalDate = isIsoDate(date) ? date : getTodayIsoDate();

  return (
    <DashboardShell
      email={user?.email ?? "Supabase unavailable"}
      view="journal"
      journalDate={journalDate}
    />
  );
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
