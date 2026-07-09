import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getViewerServer = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      3500,
    );
    if (error) return { unavailable: false, user: null };

    return { unavailable: false, user: data.user };
  } catch (error) {
    console.error("Supabase auth is unavailable", error);
    return { unavailable: true, user: null };
  }
});

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Supabase auth timed out")), timeoutMs);
    }),
  ]);
}
