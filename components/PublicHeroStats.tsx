"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
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
  const momentum = getMomentum(stats.green, stats.red, todayCounts.green, todayCounts.red);
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
      <div className="mt-8 grid grid-cols-3 gap-2 [perspective:900px] sm:gap-3">
        <Stat ready={loaded} value={stats.green} label="Green" delta={todayCounts.green} tone="green" />
        <Stat ready={loaded} value={stats.red} label="Red" delta={todayCounts.red} tone="red" />
        <Stat ready={loaded} value={stats.ratio} label="Ratio" tone="ratio" formatter={formatRatio} />
      </div>
      <div className={cn(
        "fp-reveal fp-reveal-delay-3 mt-4 border border-white/20 bg-black/24 px-4 py-3 text-left shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur-md",
        momentum.tone === "green" && "text-emerald-50",
        momentum.tone === "red" && "text-red-50",
        momentum.tone === "neutral" && "text-amber-50",
      )}>
        <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/68">
          <span>{momentum.label}</span>
          <span>{momentum.score > 0 ? "+" : ""}{momentum.score}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden bg-white/16">
          <div
            className={cn(
              "fp-progress-shine h-full transition-[width] duration-500",
              momentum.tone === "green" && "bg-emerald-300",
              momentum.tone === "red" && "bg-red-300",
              momentum.tone === "neutral" && "bg-amber-200",
            )}
            style={{ width: `${momentum.width}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-5 text-white/78">{momentum.message}</p>
      </div>
    </div>
  );
}

function Stat({
  delta,
  formatter = formatWholeNumber,
  label,
  ready,
  tone,
  value,
}: {
  delta?: number;
  formatter?: (value: number) => string;
  label: string;
  ready: boolean;
  tone: "green" | "ratio" | "red";
  value: number;
}) {
  const animatedValue = useCountUp(value, ready);

  return (
    <div className="group fp-reveal relative min-h-[112px] overflow-hidden border border-white/24 bg-white/[0.08] px-3 py-5 shadow-[0_22px_55px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md transition duration-300 [transform:rotateX(8deg)_translateZ(0)] hover:-translate-y-1 hover:[transform:rotateX(0deg)_translateZ(18px)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.18))]" />
      <div className="pointer-events-none absolute -left-10 top-0 h-20 w-28 rotate-[-24deg] bg-white/16 blur-xl transition duration-300 group-hover:translate-x-16" />
      <div
        className={[
          "pointer-events-none absolute inset-x-3 bottom-0 h-px",
          tone === "green"
            ? "bg-emerald-300/70 shadow-[0_0_24px_rgba(52,211,153,0.42)]"
            : tone === "red"
              ? "bg-red-300/70 shadow-[0_0_24px_rgba(248,113,113,0.42)]"
              : "bg-amber-200/70 shadow-[0_0_24px_rgba(251,191,36,0.38)]",
        ].join(" ")}
      />
      {delta != null ? (
        <span className="absolute right-3 top-3 z-10 text-xs font-semibold text-white/68">
          + {delta}
        </span>
      ) : null}
      <p className="relative z-10 text-4xl font-semibold leading-none text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.34)]">
        {formatter(animatedValue)}
      </p>
      <p className="relative z-10 mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72">
        {label}
      </p>
    </div>
  );
}

function getMomentum(totalGreen: number, totalRed: number, todayGreen: number, todayRed: number) {
  const score = todayGreen - todayRed;
  const lifetimeScore = totalGreen - totalRed;
  const width = Math.min(100, Math.max(16, 50 + score * 12));

  if (score > 0) {
    return {
      label: "Momentum up",
      message: "Green actions are ahead today. Keep stacking the next clean rep.",
      score,
      tone: "green" as const,
      width,
    };
  }

  if (score < 0) {
    return {
      label: "Recovery signal",
      message: "Red is visible early. One corrected choice can turn the session.",
      score,
      tone: "red" as const,
      width,
    };
  }

  return {
    label: lifetimeScore >= 0 ? "Base defended" : "Reset point",
    message: lifetimeScore >= 0
      ? "No damage today. Pick one small win and move the ratio."
      : "The board is neutral right now. Start with the easiest green action.",
    score,
    tone: "neutral" as const,
    width,
  };
}

function useCountUp(target: number, ready: boolean) {
  const [value, setValue] = useState(0);
  const latestValue = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ready) {
      latestValue.current = 0;
      hasAnimated.current = false;
      return;
    }

    const startValue = hasAnimated.current ? latestValue.current : 0;
    const endValue = Number.isFinite(target) ? target : 0;
    const duration = 900;
    const startedAt = performance.now();
    let frame = 0;

    hasAnimated.current = true;

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      latestValue.current = nextValue;
      setValue(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        latestValue.current = endValue;
        setValue(endValue);
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [ready, target]);

  return ready ? value : 0;
}

function formatWholeNumber(value: number) {
  return String(Math.round(value));
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
