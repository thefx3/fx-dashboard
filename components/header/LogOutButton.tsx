"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
    }

    return (
        <button
          onClick={handleLogout}
          className="cursor-pointer rounded-md bg-popover-foreground px-4 py-2 font-semibold text-primary-foreground transition hover:bg-destructive/90"
        >
          Déconnexion
        </button>
      );
}
