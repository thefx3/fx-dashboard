import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    </main>
  );
}
