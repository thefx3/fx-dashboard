"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  BarChart3,
  BookOpen,
  CandlestickChart,
  ChevronsLeft,
  ChevronsRight,
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

type DashboardView = "overview" | "settings" | "journal" | "trades" | "stats" | "lists" | "playbooks";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: Home, view: "overview" },
  { label: "Journal", href: "/dashboard/journal", icon: NotebookPen, view: "journal" },
  { label: "Trades", href: "/dashboard/trades", icon: CandlestickChart, view: "trades" },
  { label: "My Lists", href: "/dashboard/lists", icon: ListChecks, view: "lists" },
  { label: "Stats", href: "/dashboard/stats", icon: BarChart3, view: "stats" },
] satisfies Array<{ label: string; href: string; icon: typeof Home; view: DashboardView }>;

type DashboardShellProps = {
  email: string;
  metrics: DashboardMetric[];
  isLive: boolean;
  view?: DashboardView;
  journalDate?: string;
};

export default function DashboardShell({
  email,
  view = "overview",
  journalDate,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const today = getTodayIsoDate();
  const [activeView, setActiveView] = useState<DashboardView>(view);
  const [activeDate, setActiveDate] = useState(journalDate ?? today);
  const isSettings = activeView === "settings";
  const isJournal = activeView === "journal";
  const isTrades = activeView === "trades";
  const isStats = activeView === "stats";
  const isLists = activeView === "lists";
  const isPlaybooks = activeView === "playbooks";

  useEffect(() => {
    function handlePopState() {
      const nextView = getDashboardViewFromPath(window.location.pathname);
      const date = new URLSearchParams(window.location.search).get("date");
      setActiveView(nextView);
      setActiveDate(isIsoDate(date) ? date : today);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [today]);

  const navigate = useCallback((nextView: DashboardView, nextDate?: string) => {
    const resolvedDate = nextDate ?? activeDate;
    setActiveView(nextView);
    if (nextDate) setActiveDate(nextDate);
    window.history.pushState(null, "", getDashboardHref(nextView, nextDate ? resolvedDate : undefined));
  }, [activeDate]);

  return (
    <main className={cn(
      "grid h-screen overflow-hidden bg-site text-site transition-[grid-template-columns] duration-300 ease-out",
      sidebarCollapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[272px_1fr]",
    )}>
      <DashboardSidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        journalDate={activeDate}
        onNavigate={navigate}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        today={today}
      />

      <section className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-site bg-site/[0.92] px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileDashboardMenu activeView={activeView} onNavigate={navigate} />
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
            "flex-1",
            isPlaybooks ? "p-0" : "p-3 sm:p-5",
            isSettings || isPlaybooks ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {isSettings ? (
            <SettingsView today={today} />
          ) : isJournal ? (
            <JournalView selectedDate={activeDate} today={today} />
          ) : isTrades ? (
            <DashboardFpairWorkspace mode="trades" today={today} />
          ) : isStats ? (
            <DashboardFpairWorkspace initialDate={activeDate} mode="stats" today={today} />
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
  collapsed,
  journalDate,
  onNavigate,
  onToggleCollapsed,
  today,
}: {
  activeView: DashboardView;
  collapsed: boolean;
  journalDate: string;
  onNavigate: (view: DashboardView, date?: string) => void;
  onToggleCollapsed: () => void;
  today: string;
}) {
  const isSettingsActive = activeView === "settings";
  return (
    <aside className={cn("hidden h-screen overflow-hidden border-r border-white/10 bg-ink p-4 text-white transition-[padding] duration-300 ease-out lg:flex lg:flex-col", collapsed && "items-center px-3")}>
      <div className={cn("flex w-full items-center transition-all duration-300 ease-out", collapsed ? "justify-center" : "justify-between gap-3")}>
        {!collapsed ? <BrandMark tone="dark" className="text-white" /> : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-white/[0.12] text-white/[0.62] transition duration-200 hover:border-white/[0.2] hover:text-white"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <nav className="mt-10 space-y-1 transition-[margin] duration-300 ease-out">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view === activeView;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(event) => {
                if (!shouldUseClientNavigation(event)) return;
                event.preventDefault();
                onNavigate(item.view);
              }}
              className={cn(
                "flex w-full items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "border-white/[0.16] bg-white/[0.08] text-white"
                  : "text-white/[0.62] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <DashboardSidebarCalendar
          activeView={activeView}
          onSelectDate={(date) => onNavigate("stats", date)}
          selectedDate={journalDate}
          today={today}
        />
      ) : null}

      <div className={cn("mt-8 border-t border-white/[0.12] pt-4", collapsed && "w-full")}>
        {!collapsed ? <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/[0.72]">
          Public
        </p> : null}
        <Link
          href="/"
          className={cn("mt-3 flex w-full items-center gap-3 border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/[0.72] transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white", collapsed && "justify-center px-2")}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {!collapsed ? "Public site" : <span className="sr-only">Public site</span>}
        </Link>
        <Link
          href="/dashboard/playbooks"
          onClick={(event) => {
            if (!shouldUseClientNavigation(event)) return;
            event.preventDefault();
            onNavigate("playbooks");
          }}
          className={cn(
            "mt-2 flex w-full items-center gap-3 border px-3 py-2.5 text-sm font-medium transition",
            collapsed && "justify-center px-2",
            activeView === "playbooks"
              ? "border-white/[0.16] bg-white/[0.08] text-white"
              : "border-white/[0.12] bg-white/[0.06] text-white/[0.72] hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white",
          )}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {!collapsed ? "Playbooks" : <span className="sr-only">Playbooks</span>}
        </Link>
      </div>

      <div className={cn("mt-auto border-t border-white/[0.12] pt-4", collapsed && "w-full")}>
        <Link
          href="/dashboard/settings"
          onClick={(event) => {
            if (!shouldUseClientNavigation(event)) return;
            event.preventDefault();
            onNavigate("settings");
          }}
          className={cn(
            "flex w-full items-center gap-3 border border-transparent px-3 py-2.5 text-sm font-medium transition",
            collapsed && "justify-center px-2",
            isSettingsActive
              ? "border-white/[0.16] bg-white/[0.08] text-white"
              : "text-white/[0.62] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white",
          )}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          {!collapsed ? "Settings" : <span className="sr-only">Settings</span>}
        </Link>
      </div>

    </aside>
  );
}

function MobileDashboardMenu({
  activeView,
  onNavigate,
}: {
  activeView: DashboardView;
  onNavigate: (view: DashboardView, date?: string) => void;
}) {
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
              onClick={(event) => {
                if (!shouldUseClientNavigation(event)) return;
                event.preventDefault();
                onNavigate(item.view);
              }}
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
          onClick={(event) => {
            if (!shouldUseClientNavigation(event)) return;
            event.preventDefault();
            onNavigate("settings");
          }}
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
          onClick={(event) => {
            if (!shouldUseClientNavigation(event)) return;
            event.preventDefault();
            onNavigate("playbooks");
          }}
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

function shouldUseClientNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function getDashboardHref(view: DashboardView, date?: string) {
  const basePath =
    view === "overview"
      ? "/dashboard"
      : view === "settings"
        ? "/dashboard/settings"
        : view === "playbooks"
          ? "/dashboard/playbooks"
          : `/dashboard/${view}`;

  return date && (view === "journal" || view === "stats") ? `${basePath}?date=${date}` : basePath;
}

function getDashboardViewFromPath(pathname: string): DashboardView {
  if (pathname.startsWith("/dashboard/journal")) return "journal";
  if (pathname.startsWith("/dashboard/trades")) return "trades";
  if (pathname.startsWith("/dashboard/lists")) return "lists";
  if (pathname.startsWith("/dashboard/stats")) return "stats";
  if (pathname.startsWith("/dashboard/playbooks")) return "playbooks";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  return "overview";
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
