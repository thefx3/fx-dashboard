"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function ProfileSettingsForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("The password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmation("");
    setMessage("Password updated.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">New password</span>
          <input
            className="form-input mt-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Confirmation</span>
          <input
            className="form-input mt-2"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      {error ? (
        <p className="form-message border-red-200 bg-red-50 text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="form-message border-emerald-200 bg-emerald-50 text-emerald-700">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary justify-center">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Change password
      </button>
    </form>
  );
}
