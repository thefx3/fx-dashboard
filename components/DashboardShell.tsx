import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CandlestickChart,
  ExternalLink,
  Home,
  ListChecks,
  Menu,
  NotebookPen,
  Settings,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import DashboardFpairWorkspace from "@/components/DashboardFpairWorkspace";
import DashboardLogoutButton from "@/components/DashboardLogoutButton";
import DashboardPlaybooks from "@/components/DashboardPlaybooks";
import DashboardSidebarCalendar from "@/components/DashboardSidebarCalendar";
import DayCounter from "@/components/DayCounter";
import JournalDataReset from "@/components/JournalDataReset";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import SelfCareSettings from "@/components/SelfCareSettings";
import { cn } from "@/lib/cn";
import { getTodayIsoDate } from "@/lib/date";
import type { DashboardMetric } from "@/lib/dashboard-metrics";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: Home, view: "overview" },
  { label: "Journal", href: "/dashboard/journal", icon: NotebookPen, view: "journal" },
  { label: "Trades", href: "/dashboard/trades", icon: CandlestickChart, view: "trades" },
  { label: "My Lists", href: "/dashboard/lists", icon: ListChecks, view: "lists" },
  { label: "Stats", href: "/dashboard/stats", icon: BarChart3, view: "stats" },
];

type DashboardShellProps = {
  email: string;
  metrics: DashboardMetric[];
  isLive: boolean;
  view?: "overview" | "settings" | "journal" | "trades" | "stats" | "lists" | "playbooks";
  journalDate?: string;
};

export default function DashboardShell({
  email,
  view = "overview",
  journalDate,
}: DashboardShellProps) {
  const today = getTodayIsoDate();
  const isSettings = view === "settings";
  const isJournal = view === "journal";
  const isTrades = view === "trades";
  const isStats = view === "stats";
  const isLists = view === "lists";
  const isPlaybooks = view === "playbooks";

  return (
    <main className="grid h-screen overflow-hidden bg-site text-site lg:grid-cols-[272px_1fr]">
      <DashboardSidebar
        activeView={view}
        journalDate={journalDate ?? today}
        today={today}
      />

      <section className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-site bg-site/[0.92] px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileDashboardMenu activeView={view} />
            <DayCounter today={today} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate border border-site bg-card px-3 py-2 text-sm text-site-muted sm:inline-flex">
              {email}
            </span>
            <DashboardLogoutButton />
          </div>
        </header>

        <div
          className={cn(
            "flex-1 p-3 sm:p-5",
            isSettings ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {isSettings ? (
            <SettingsView today={today} />
          ) : isJournal ? (
            <JournalView selectedDate={journalDate ?? today} today={today} />
          ) : isTrades ? (
            <DashboardFpairWorkspace mode="trades" today={today} />
          ) : isStats ? (
            <DashboardFpairWorkspace initialDate={journalDate ?? today} mode="stats" today={today} />
          ) : isLists ? (
            <DashboardFpairWorkspace mode="lists" today={today} />
          ) : isPlaybooks ? (
            <DashboardPlaybooks />
          ) : (
            <OverviewView today={today} />
          )}
        </div>
      </section>
    </main>
  );
}

function JournalView({
  selectedDate,
  today,
}: {
  selectedDate: string;
  today: string;
}) {
  return <DashboardFpairWorkspace initialDate={selectedDate} mode="journal" today={today} />;
}

function OverviewView({ today }: { today: string }) {
  return <DashboardFpairWorkspace mode="overview" today={today} />;
}

function SettingsView({ today }: { today: string }) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto">
      <div className="grid gap-3 xl:grid-cols-2">
        <SelfCareSettings />
        <section className="surface p-5">
          <p className="eyebrow">Profile settings</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight">
            Password
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-site-muted">
            Update the password for the signed-in account. The change applies to
            this private workspace immediately.
          </p>

          <div className="mt-5 max-w-2xl">
            <ProfileSettingsForm />
          </div>
        </section>
      </div>
      <JournalDataReset today={today} />
    </div>
  );
}

function DashboardSidebar({
  activeView,
  journalDate,
  today,
}: {
  activeView: DashboardShellProps["view"];
  journalDate: string;
  today: string;
}) {
  const isSettingsActive = activeView === "settings";
  return (
    <aside className="hidden h-screen overflow-hidden border-r border-white/10 bg-ink p-4 text-white lg:flex lg:flex-col">
      <BrandMark tone="dark" className="text-white" />

      <nav className="mt-10 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view === activeView;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-white/[0.16] bg-white/[0.08] text-white"
                  : "text-white/[0.62] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <DashboardSidebarCalendar activeView={activeView} selectedDate={journalDate} today={today} />

      <div className="mt-8 border-t border-white/[0.12] pt-4">
        <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/[0.72]">
          Public
        </p>
        <Link
          href="/"
          className="mt-3 flex w-full items-center gap-3 border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/[0.72] transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Public site
        </Link>
        <Link
          href="/dashboard/playbooks"
          className={cn(
            "mt-2 flex w-full items-center gap-3 border px-3 py-2.5 text-sm font-medium transition",
            activeView === "playbooks"
              ? "border-white/[0.16] bg-white/[0.08] text-white"
              : "border-white/[0.12] bg-white/[0.06] text-white/[0.72] hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white",
          )}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Playbooks
        </Link>
      </div>

      <div className="mt-auto border-t border-white/[0.12] pt-4">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex w-full items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-medium transition",
            isSettingsActive
              ? "border-white/[0.16] bg-white/[0.08] text-white"
              : "text-white/[0.62] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white",
          )}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
      </div>

    </aside>
  );
}

function MobileDashboardMenu({ activeView }: { activeView: DashboardShellProps["view"] }) {
  return (
    <details className="group relative lg:hidden">
      <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-site bg-card text-site-muted transition hover:text-site [&::-webkit-details-marker]:hidden">
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open dashboard menu</span>
      </summary>
      <div className="absolute left-0 top-12 z-50 grid w-[min(82vw,280px)] gap-1 border border-site bg-card p-2 shadow-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view === activeView;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 border px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "border-site bg-ink text-white"
                  : "border-transparent text-site-muted hover:border-site hover:text-site",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 border px-3 py-2.5 text-sm font-semibold transition",
            activeView === "settings"
              ? "border-site bg-ink text-white"
              : "border-transparent text-site-muted hover:border-site hover:text-site",
          )}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-semibold text-site-muted transition hover:border-site hover:text-site"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Public site
        </Link>
        <Link
          href="/dashboard/playbooks"
          className={cn(
            "flex items-center gap-3 border px-3 py-2.5 text-sm font-semibold transition",
            activeView === "playbooks"
              ? "border-site bg-ink text-white"
              : "border-transparent text-site-muted hover:border-site hover:text-site",
          )}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Playbooks
        </Link>
      </div>
    </details>
  );
}
