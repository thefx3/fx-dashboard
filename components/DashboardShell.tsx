import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CandlestickChart,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home,
  ListChecks,
  NotebookPen,
  Settings,
  Target,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import DashboardFpairWorkspace from "@/components/DashboardFpairWorkspace";
import DashboardJournal from "@/components/DashboardJournal";
import DashboardLogoutButton from "@/components/DashboardLogoutButton";
import DayCounter from "@/components/DayCounter";
import JournalDataReset from "@/components/JournalDataReset";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import SelfCareSettings from "@/components/SelfCareSettings";
import { cn } from "@/lib/cn";
import { getTodayIsoDate, toIsoDate } from "@/lib/date";
import type { DashboardMetric } from "@/lib/dashboard-metrics";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: Home, view: "overview" },
  { label: "Quests", href: "/dashboard/quests", icon: Target, view: "quests" },
  { label: "Journal", href: "/dashboard/journal", icon: NotebookPen, view: "journal" },
  { label: "Stats", href: "/dashboard/stats", icon: BarChart3, view: "stats" },
  { label: "My Lists", href: "/dashboard/lists", icon: ListChecks, view: "lists" },
  { label: "Trades", href: "/dashboard/trades", icon: CandlestickChart, view: "trades" },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays, view: "calendar" },
];

type DashboardShellProps = {
  email: string;
  metrics: DashboardMetric[];
  isLive: boolean;
  view?: "overview" | "settings" | "journal" | "trades" | "calendar" | "stats" | "quests" | "lists";
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
  const isCalendar = view === "calendar";
  const isStats = view === "stats";
  const isQuests = view === "quests";
  const isLists = view === "lists";

  return (
    <main className="grid h-screen overflow-hidden bg-site text-site lg:grid-cols-[272px_1fr]">
      <DashboardSidebar
        email={email}
        activeView={view}
        journalDate={journalDate ?? today}
        today={today}
      />

      <section className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-site bg-site/[0.92] px-4 backdrop-blur sm:px-6">
          <DayCounter today={today} />
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
            <SettingsView email={email} today={today} />
          ) : isJournal ? (
            <JournalView selectedDate={journalDate ?? today} today={today} />
          ) : isTrades ? (
            <DashboardFpairWorkspace mode="trades" today={today} />
          ) : isCalendar ? (
            <DashboardFpairWorkspace initialDate={journalDate ?? today} mode="calendar" today={today} />
          ) : isStats ? (
            <DashboardFpairWorkspace initialDate={journalDate ?? today} mode="stats" today={today} />
          ) : isQuests ? (
            <DashboardFpairWorkspace mode="quests" today={today} />
          ) : isLists ? (
            <DashboardFpairWorkspace mode="lists" today={today} />
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
  return <DashboardJournal today={today} selectedDate={selectedDate} />;
}

function OverviewView({ today }: { today: string }) {
  return <DashboardFpairWorkspace mode="overview" today={today} />;
}

function SettingsView({ email, today }: { email: string; today: string }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
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

      <div className="grid min-h-0 gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="surface-dark p-5">
          <span className="grid h-10 w-10 place-items-center border border-white/[0.16] bg-white/10">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-medium text-white/[0.62]">Account</p>
          <p className="mt-2 truncate text-base font-semibold">{email}</p>
          <div className="mt-4 border border-white/[0.14] bg-white/[0.08] p-3">
            <p className="text-sm font-semibold">Active session</p>
            <p className="mt-1 text-sm leading-6 text-white/[0.62]">
              Your account is signed in and ready to sync private data.
            </p>
          </div>
        </aside>
        <div className="grid min-h-0 gap-3 overflow-y-auto">
          <SelfCareSettings />
          <JournalDataReset today={today} />
        </div>
      </div>
    </div>
  );
}

function DashboardSidebar({
  email,
  activeView,
  journalDate,
  today,
}: {
  email: string;
  activeView: DashboardShellProps["view"];
  journalDate: string;
  today: string;
}) {
  const isSettingsActive = activeView === "settings";
  const showJournalCalendar = activeView === "journal" || activeView === "calendar" || activeView === "stats";

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

      {showJournalCalendar ? (
        <SidebarCalendar basePath={activeView === "calendar" ? "/dashboard/calendar" : activeView === "stats" ? "/dashboard/stats" : "/dashboard/journal"} selectedDate={journalDate} today={today} />
      ) : null}

      <div className="mt-8 border-t border-white/[0.12] pt-4">
        <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/[0.38]">
          Public
        </p>
        <Link
          href="/"
          className="mt-3 flex w-full items-center gap-3 border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/[0.72] transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Public site
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

      <div className="mt-4 border border-white/[0.14] bg-white/[0.08] p-4">
        <p className="text-sm font-semibold">Signed-in account</p>
        <p className="mt-1 truncate text-xs text-white/[0.62]">{email}</p>
      </div>
    </aside>
  );
}

function SidebarCalendar({
  basePath,
  selectedDate,
  today,
}: {
  basePath: string;
  selectedDate: string;
  today: string;
}) {
  const monthDays = getMonthDays(selectedDate);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${selectedDate}T00:00:00`));
  const previousMonth = shiftMonth(selectedDate, -1);
  const nextMonth = shiftMonth(selectedDate, 1);

  return (
    <div className="mt-3 border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${basePath}?date=${previousMonth}`}
          className="inline-flex h-8 w-8 items-center justify-center border border-white/[0.12] text-white/[0.62] transition hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.72]">
          {monthLabel}
        </p>
        <Link
          href={`${basePath}?date=${nextMonth}`}
          className="inline-flex h-8 w-8 items-center justify-center border border-white/[0.12] text-white/[0.62] transition hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold uppercase text-white/[0.38]">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {monthDays.map((day, index) =>
          day ? (
            <Link
              key={day.date}
              href={`${basePath}?date=${day.date}`}
              className={cn(
                "grid h-7 place-items-center text-xs font-semibold transition",
                day.date === selectedDate
                  ? "bg-white text-ink"
                  : "text-white/[0.62] hover:bg-white/[0.08] hover:text-white",
                day.date === today && day.date !== selectedDate && "ring-1 ring-white/[0.24]",
              )}
            >
              {day.day}
            </Link>
          ) : (
            <span key={`empty-${index}`} aria-hidden="true" />
          ),
        )}
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
