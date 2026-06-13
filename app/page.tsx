import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame, RotateCcw, Target } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicHeroStats from "@/components/PublicHeroStats";
import { getTodayIsoDate } from "@/lib/date";

export default function HomePage() {
  const today = getTodayIsoDate();

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <PublicHeader variant="overlay" />

      <section
        id="mission"
        className="relative isolate flex min-h-screen items-end overflow-hidden"
      >
        <Image
          src="/images/wallpaper-2.jpg"
          alt="Beach view from an interior at sunset"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/[0.18] to-transparent"
          aria-hidden="true"
        />
        <PublicHeroStats today={today} />

        <div className="relative w-full px-5 pb-14 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/80">
              PERSONAL SYSTEM
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-none sm:text-7xl lg:text-8xl">
              F PAIR_
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/[0.78] sm:text-lg">
              Building systems for trading, discipline and performance.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="#progress" className="hero-link">
              VIEW PROGRESS
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="#playbooks" className="hero-link">
              READ PLAYBOOKS
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="progress" className="bg-site py-16 text-site sm:py-20">
        <div className="fp-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div className="fp-reveal">
            <p className="eyebrow">Progress loop</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
              Make wins obvious. Turn misses into the next move.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ProgressCard
              icon={CheckCircle2}
              title="Wins"
              text="Every green point gets visual weight so the day feels earned."
              tone="green"
            />
            <ProgressCard
              icon={RotateCcw}
              title="Misses"
              text="Red points stay visible as feedback, not noise."
              tone="red"
            />
            <ProgressCard
              icon={Flame}
              title="Streak"
              text="Momentum is highlighted before it becomes easy to ignore."
              tone="amber"
            />
          </div>
        </div>
      </section>

      <section id="playbooks" className="bg-[#121212] py-16 text-white sm:py-20">
        <div className="fp-container grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-2">
            {["Review red point", "Lock green action", "Write lesson", "Repeat tomorrow"].map((item, index) => (
              <div
                key={item}
                className="fp-hover-lift fp-reveal border border-white/12 bg-white/[0.06] p-5"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center border border-white/14 text-[#d9aa62]">
                  <Target className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-white/58">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{item}</h3>
              </div>
            ))}
          </div>
          <div className="fp-reveal fp-reveal-delay-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d9aa62]">
              Playbooks
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
              The dashboard should push the next clean action.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/64">
              The public page now mirrors the same discipline loop: celebrate
              what worked, expose what failed, then point back to the next rep.
            </p>
            <Link href="/dashboard" className="hero-link mt-8">
              OPEN DASHBOARD
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProgressCard({
  icon: Icon,
  text,
  title,
  tone,
}: {
  icon: typeof CheckCircle2;
  text: string;
  title: string;
  tone: "amber" | "green" | "red";
}) {
  const toneClasses = {
    amber: "border-[#d9aa62]/45 text-[#8a6427]",
    green: "border-emerald-500/35 text-emerald-700",
    red: "border-red-500/35 text-red-700",
  };

  return (
    <article className="fp-hover-lift fp-reveal surface p-5">
      <span className={`inline-flex h-11 w-11 items-center justify-center border bg-site ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-site-muted">{text}</p>
    </article>
  );
}
