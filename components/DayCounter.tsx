"use client";

import { Flame } from "lucide-react";
import { daysBetween, getGreenStreak } from "@/lib/dashboard-data";
import { useDashboardSnapshot } from "@/lib/use-dashboard-snapshot";

export default function DayCounter({ today }: { today: string }) {
  const { settings, entries, loaded } = useDashboardSnapshot();
  const startDate = settings.startDate;
  const streak = getGreenStreak(entries, today);
  const dayLabel =
    loaded && startDate ? `Day ${daysBetween(startDate, today)}` : "Day --";

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-xl font-semibold">
        {dayLabel}
      </h1>
      {streak > 0 ? (
        <span className="inline-flex items-center gap-1 border border-site bg-card px-2 py-1 text-sm font-semibold text-site-muted">
          <Flame className="h-4 w-4 text-red-500" aria-hidden="true" />
          {streak}
        </span>
      ) : null}
    </div>
  );
}
