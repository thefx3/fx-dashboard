//LoginForm.tsx
"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
      >
        <div className="bg-popover-foreground px-6 py-5 text-primary-foreground">
          <h1 className="font-title text-2xl uppercase tracking-widest">All-in-one Dashboard</h1>
          <p className="mt-1 text-sm text-accent/90">
            Accès réservé
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            disabled={pending}
            className="mt-1 w-full rounded-md bg-popover-foreground px-4 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {pending ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </form>
    </div>
  );
}
