import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShellNext";
import { getViewerServer } from "@/lib/auth/viewer.server";

export default async function DashboardSettingsPage() {
  const { unavailable, user } = await getViewerServer();
  if (!user && !unavailable) redirect("/dashboard/login");

  return (
    <DashboardShell
      email={user?.email ?? "Supabase unavailable"}
      view="settings"
    />
  );
}
