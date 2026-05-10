"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLogoutButton() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/dashboard/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-10 w-10 items-center justify-center bg-ink text-white transition hover:bg-brand"
      aria-label="Logout"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
