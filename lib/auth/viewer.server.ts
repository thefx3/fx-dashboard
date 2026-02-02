import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getViewerServer = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) return { user: null };

  return { user: data.user };
});
