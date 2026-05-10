import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getViewerServer = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { unavailable: false, user: null };

    return { unavailable: false, user: data.user };
  } catch (error) {
    console.error("Supabase auth is unavailable", error);
    return { unavailable: true, user: null };
  }
});
