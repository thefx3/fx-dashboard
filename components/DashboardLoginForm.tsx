"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[390px]">
      <div className="mb-10">
        <p className="eyebrow">Secure access</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-site-muted">
          Sign in to your private performance system.
        </p>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-semibold">Email</span>
          <input
            className="form-input mt-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-sm font-semibold">
            Password
            <span className="text-xs font-medium text-site-muted">Protected</span>
          </span>
          <span className="relative mt-2 block">
            <input
              className="form-input pr-11"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-site text-site-muted transition hover:text-site"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        {error ? (
          <p className="form-message border-red-200 bg-red-50 text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-primary w-full justify-center">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Sign in
        </button>
      </div>
    </form>
  );
}
