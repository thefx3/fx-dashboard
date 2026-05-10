import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { getViewerServer } from "@/lib/auth/viewer.server";

export default async function DashboardSettingsPage() {
  const { unavailable, user } = await getViewerServer();
  if (!user && !unavailable) redirect("/dashboard/login");

  const { metrics, isLive } = await getDashboardMetrics();

  return (
    <DashboardShell
      email={user?.email ?? "Supabase unavailable"}
      metrics={metrics}
      isLive={isLive}
      view="settings"
    />
  );
}
