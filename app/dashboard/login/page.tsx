import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpenCheck, ShieldCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import DashboardLoginForm from "@/components/DashboardLoginForm";
import { getViewerServer } from "@/lib/auth/viewer.server";

const systemCards = [
  { label: "Progress", value: "Stats + streaks", icon: BarChart3 },
  { label: "Playbooks", value: "Lessons learned", icon: BookOpenCheck },
  { label: "Security", value: "Private access", icon: ShieldCheck },
];

export default async function DashboardLoginPage() {
  const { user } = await getViewerServer();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen bg-site text-site lg:grid-cols-[0.92fr_1.08fr]">
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-site-muted transition hover:text-site"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <DashboardLoginForm />
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-ink text-white lg:block">
        <Image
          src="/images/wallpaper-2.jpg"
          alt="Beach view from an interior at sunset"
          fill
          priority
          sizes="55vw"
          className="object-cover opacity-[0.82]"
        />
        <div className="absolute inset-0 bg-black/[0.32]" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent"
          aria-hidden="true"
        />

        <div className="relative flex min-h-screen flex-col justify-end p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/[0.72]">
            PERSONAL SYSTEM
          </p>
          <h2 className="mt-4 max-w-xl text-5xl font-semibold leading-none">
            Trading, discipline and performance in one private cockpit.
          </h2>

          <div className="mt-10 grid gap-3">
            {systemCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="grid grid-cols-[44px_1fr] items-center gap-4 border border-white/[0.16] bg-white/10 p-4 backdrop-blur"
                >
                  <span className="grid h-11 w-11 place-items-center border border-white/[0.24] bg-white/10">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm text-white/[0.66]">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
