"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { toIsoDate } from "@/lib/date";
import { getCurrentUserId } from "@/lib/dashboard-data";
import { getDayBreakdown, getLatestFpairSnapshot, loadFpairSnapshot, subscribeFpairChanges, type FpairSnapshot } from "@/lib/fpair-data";

type CalendarView = "overview" | "settings" | "journal" | "trades" | "stats" | "lists" | "playbooks" | undefined;

export default function DashboardSidebarCalendar({
  activeView,
  selectedDate,
  today,
}: {
  activeView: CalendarView;
  selectedDate: string;
  today: string;
}) {
  const [visibleDate, setVisibleDate] = useState(selectedDate);
  const [snapshot, setSnapshot] = useState<FpairSnapshot | null>(() => getLatestFpairSnapshot());
  const basePath = "/dashboard/stats";

  useEffect(() => {
    setVisibleDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function load() {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;
      const next = await loadFpairSnapshot(userId).catch(() => null);
      if (!cancelled && next) setSnapshot(next);
      unsubscribe = subscribeFpairChanges(userId, () => {
        void loadFpairSnapshot(userId, { force: true }).then((fresh) => {
          if (!cancelled) setSnapshot(fresh);
        }).catch(() => undefined);
      });
    }

    void load();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const monthDays = useMemo(() => getMonthDays(visibleDate), [visibleDate]);
  const scoredDays = useMemo(() => {
    const positive = new Set<string>();
    const negative = new Set<string>();
    if (!snapshot) return { negative, positive };

    monthDays.filter(Boolean).forEach((day) => {
      const breakdown = getDayBreakdown(snapshot, day!.date);
      if (breakdown.green > breakdown.red) positive.add(day!.date);
      if (breakdown.red > breakdown.green) negative.add(day!.date);
    });

    return { negative, positive };
  }, [monthDays, snapshot]);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${visibleDate}T00:00:00`));

  return (
    <div className="mt-3 border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center border border-white/[0.12] text-white/[0.62] transition hover:text-white"
          aria-label="Previous month"
          onClick={() => setVisibleDate(shiftMonth(visibleDate, -1))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.72]">
          {monthLabel}
        </p>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center border border-white/[0.12] text-white/[0.62] transition hover:text-white"
          aria-label="Next month"
          onClick={() => setVisibleDate(shiftMonth(visibleDate, 1))}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold uppercase text-white/[0.72]">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
          const isSelected = activeView === "stats" && day.date === selectedDate;
          const isToday = day.date === today;
          const isPositive = scoredDays.positive.has(day.date);
          const isNegative = scoredDays.negative.has(day.date);
          const className = cn(
            "grid h-7 place-items-center text-xs font-semibold transition",
            isSelected
              ? "bg-white text-ink"
              : isPositive
                ? "bg-[#1f6feb] text-white hover:bg-[#2f81f7]"
                : isNegative
                  ? "bg-red-600 text-white hover:bg-red-500"
                : "text-white/[0.62] hover:bg-white/[0.08] hover:text-white",
            isToday && !isSelected && "ring-1 ring-white/[0.24]",
          );
          return (
            <Link
              key={day.date}
              href={`${basePath}?date=${day.date}`}
              className={className}
              onClick={() => window.dispatchEvent(new CustomEvent("fpair:stats-history-date", { detail: day.date }))}
            >
              {day.day}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getMonthDays(selectedDate: string) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const days: Array<{ date: string; day: number } | null> = Array.from({
    length: mondayOffset,
  }).map(() => null);

  for (let day = 1; day <= lastDay; day += 1) {
    days.push({
      day,
      date: toIsoDate(new Date(year, month, day)),
    });
  }

  return days;
}

function shiftMonth(selectedDate: string, offset: number) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const selectedDay = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(selectedDay, lastDay));
  return toIsoDate(target);
}
