"use client";

import { useEffect, useState } from "react";
import { getCurrentUserId } from "@/lib/dashboard-data";
import { defaultProfile, loadFpairSnapshot, saveProfile, type Profile } from "@/lib/fpair-data";

export default function SelfCareSettings() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;
      const snapshot = await loadFpairSnapshot(currentUserId).catch(() => null);
      if (cancelled) return;
      setUserId(currentUserId);
      if (snapshot) setProfile(snapshot.profile);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!userId || pending) return;
    setPending(true);
    setMessage("");
    try {
      await saveProfile(userId, profile);
      setMessage("Self-care settings saved.");
    } catch {
      setMessage("Sync failed. Check Supabase connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="surface p-5">
      <p className="eyebrow">Self-care</p>
      <h2 className="mt-2 text-xl font-semibold">Targets</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumberField label="Sleep hours" value={profile.sleepGreenHours} onChange={(sleepGreenHours) => setProfile((current) => ({ ...current, sleepGreenHours }))} />
        <NumberField label="Screen minutes" value={profile.screenTimeRedMinutes} onChange={(screenTimeRedMinutes) => setProfile((current) => ({ ...current, screenTimeRedMinutes }))} />
        <NumberField label="Run km" value={profile.runGreenKm} onChange={(runGreenKm) => setProfile((current) => ({ ...current, runGreenKm }))} />
        <NumberField label="Calories kcal" value={profile.caloriesGreenKcal} onChange={(caloriesGreenKcal) => setProfile((current) => ({ ...current, caloriesGreenKcal }))} />
      </div>
      <button type="button" className="btn-primary mt-4 justify-center" disabled={!userId || pending} onClick={save}>
        Save self-care
      </button>
      {message ? <p className="mt-3 text-sm text-site-muted">{message}</p> : null}
    </section>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-site-muted">{label}</span>
      <input className="form-input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}
