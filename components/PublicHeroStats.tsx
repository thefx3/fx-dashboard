"use client";

import {
  countEntry,
  daysBetween,
} from "@/lib/dashboard-data";
import { useDashboardSnapshot } from "@/lib/use-dashboard-snapshot";

type Stats = {
  green: number;
  ratio: number;
  red: number;
};

export default function PublicHeroStats({ today }: { today: string }) {
  const { settings, entries, loaded } = useDashboardSnapshot();
  const totals = Object.entries(entries).reduce(
    (acc, [date, entry]) => {
      const counts = countEntry(entry, date);
      acc.green += counts.green;
      acc.red += counts.red;
      return acc;
    },
    { green: 0, red: 0 },
  );
  const dayLabel =
    loaded && settings.startDate
      ? `Day ${daysBetween(settings.startDate, today)}`
      : "Day --";
  const stats: Stats = {
    green: totals.green,
    ratio: totals.green + totals.red ? Math.round((totals.green / (totals.green + totals.red)) * 100) : 0,
    red: totals.red,
  };

  return (
    <div className="absolute left-1/2 top-[38%] z-10 w-[min(88vw,520px)] -translate-x-1/2 -translate-y-1/2 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/72">
        {dayLabel}
      </p>
      <div className="mt-8 grid grid-cols-3 divide-x divide-white/22 border-y border-white/22 bg-black/12 py-5 backdrop-blur-sm">
        <Stat value={stats.green} label="Green" />
        <Stat value={stats.red} label="Red" />
        <Stat value={`${stats.ratio}%`} label="Ratio" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-semibold leading-none">{value}</p>
      <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72">
        {label}
      </p>
    </div>
  );
}
