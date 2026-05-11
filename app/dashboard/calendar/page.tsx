import { redirect } from "next/navigation";
import { getTodayIsoDate } from "@/lib/date";

export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  redirect(`/dashboard/stats?date=${isIsoDate(date) ? date : getTodayIsoDate()}`);
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
