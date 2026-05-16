"use client";

import { useEffect, useState } from "react";
import { daysBetween, getCurrentUserId } from "@/lib/dashboard-data";
import {
  getDayBreakdown,
  getLatestFpairSnapshot,
  getStats,
  loadFpairSnapshot,
  subscribeFpairChanges,
  type FpairSnapshot,
} from "@/lib/fpair-data";

type Stats = {
  green: number;
  ratio: number;
  red: number;
};

export default function PublicHeroStats({ today }: { today: string }) {
  const [snapshot, setSnapshot] = useState<FpairSnapshot | null>(() => getLatestFpairSnapshot());
  const [loaded, setLoaded] = useState(Boolean(snapshot));
  const startDate = snapshot?.settings.startDate ?? "";
  const stats: Stats = snapshot && startDate
    ? getStats(snapshot, startDate, today)
    : { green: 0, ratio: 0, red: 0 };
  const todayCounts = snapshot ? getDayBreakdown(snapshot, today) : { green: 0, red: 0 };
  const dayLabel =
    loaded && startDate
      ? `Day ${daysBetween(startDate, today)}`
      : "Day --";

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function load(force = false) {
      const userId = await getCurrentUserId();
      if (!userId) {
        if (!cancelled) setLoaded(true);
        return;
      }
      if (cancelled) return;

      unsubscribe ??= subscribeFpairChanges(userId, () => void load(true));
      const next = await loadFpairSnapshot(userId, { force }).catch(() => null);
      if (!cancelled) {
        setSnapshot(next);
        setLoaded(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="absolute left-1/2 top-[38%] z-10 w-[min(88vw,520px)] -translate-x-1/2 -translate-y-1/2 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/72">
        {dayLabel}
      </p>
      <div className="mt-8 grid grid-cols-3 divide-x divide-white/22 border-y border-white/22 bg-black/12 py-5 backdrop-blur-sm">
        <Stat value={stats.green} label="Green" delta={todayCounts.green} />
        <Stat value={stats.red} label="Red" delta={todayCounts.red} />
        <Stat value={formatRatio(stats.ratio)} label="Ratio" />
      </div>
    </div>
  );
}

function Stat({ value, label, delta }: { value: number | string; label: string; delta?: number }) {
  return (
    <div className="relative">
      {delta != null ? (
        <span className="absolute right-4 top-0 text-xs font-semibold text-white/58">
          + {delta}
        </span>
      ) : null}
      <p className="text-4xl font-semibold leading-none">{value}</p>
      <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72">
        {label}
      </p>
    </div>
  );
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
