"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  HeartPulse,
  Pencil,
  Plus,
  Target,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import DashboardJournal from "@/components/DashboardJournal";
import { getTodayIsoDate, toIsoDate } from "@/lib/date";
import { emptyEntry, getCurrentUserId, saveJournalEntry } from "@/lib/dashboard-data";
import {
  buildTodayHealth,
  applyAccountPhaseTransition,
  createAccount,
  createTrade,
  defaultProfile,
  enumerateDates,
  formatMoney,
  formatMoneyCompact,
  getActiveQuests,
  getDayBreakdown,
  getDayBreakdownForLevel,
  getLatestFpairSnapshot,
  getLevelProgress,
  getQuestStatus,
  getQuestValue,
  getStats,
  getTradingStats,
  loadFpairSnapshot,
  deleteListItem,
  deleteQuest,
  saveAccount,
  saveListItem,
  savePropFirmPlan,
  saveQuest,
  saveQuestResult,
  saveTrade,
  subscribeFpairChanges,
  type Account,
  type AccountPhase,
  type FpairSnapshot,
  type ListItem,
  type ListType,
  type PropFirmPlan,
  type Quest,
  questCategories,
  createQuest,
  type TradeDirection,
} from "@/lib/fpair-data";

type StatsRange = "daily" | "weekly" | "monthly" | "yearly";
type StatsTab = "history" | StatsRange;
type WorkspaceMode = "overview" | "journal" | "trades" | "stats" | "lists";
type TradesSubTab = "trades" | "accounts" | "session-risk";

const emptySnapshot: FpairSnapshot = {
  accounts: [],
  health: {},
  journal: {},
  lists: [],
  profile: defaultProfile,
  propFirmPlans: [],
  questResults: {},
  quests: [],
  remoteProgress: null,
  screenTime: [],
  sessions: [],
  settings: {
    lastDeleteDate: "",
    startDate: getTodayIsoDate(),
    startDateChangedAt: "",
  },
  trades: [],
};

const tradingSessions = [
  { id: "asia", name: "Asia", focus: "Asian range, lower volatility and liquidity setup.", open: 20 * 60, close: 0, color: "#3A6EA5" },
  { id: "london", name: "London", focus: "European index futures and London momentum.", open: 2 * 60, close: 5 * 60, color: "#2F7D57" },
  { id: "ny-am", name: "NY AM", focus: "US open, news impulse and strongest volatility window.", open: 6 * 60, close: 10 * 60, color: "#B94A3E" },
  { id: "ny-lunch", name: "NY Lunch", focus: "Lower liquidity, manage open trades and avoid forcing entries.", open: 12 * 60, close: 13 * 60 + 30, color: "#C6A96B" },
  { id: "ny-pm", name: "NY PM", focus: "Afternoon continuation or reversal.", open: 13 * 60 + 30, close: 16 * 60, color: "#3B2A1F" },
];

const continents = ["Europe", "Asia", "Oceania", "Latin America", "Africa"];
const countryOptions = [
  { label: "Austria", region: "Europe", timezone: "Europe/Vienna" },
  { label: "Belgium", region: "Europe", timezone: "Europe/Brussels" },
  { label: "Denmark", region: "Europe", timezone: "Europe/Copenhagen" },
  { label: "England", region: "Europe", timezone: "Europe/London" },
  { label: "France", region: "Europe", timezone: "Europe/Paris" },
  { label: "Germany", region: "Europe", timezone: "Europe/Berlin" },
  { label: "Greece", region: "Europe", timezone: "Europe/Athens" },
  { label: "Ireland", region: "Europe", timezone: "Europe/Dublin" },
  { label: "Italy", region: "Europe", timezone: "Europe/Rome" },
  { label: "Netherlands", region: "Europe", timezone: "Europe/Amsterdam" },
  { label: "Norway", region: "Europe", timezone: "Europe/Oslo" },
  { label: "Poland", region: "Europe", timezone: "Europe/Warsaw" },
  { label: "Portugal", region: "Europe", timezone: "Europe/Lisbon" },
  { label: "Spain", region: "Europe", timezone: "Europe/Madrid" },
  { label: "Sweden", region: "Europe", timezone: "Europe/Stockholm" },
  { label: "Switzerland", region: "Europe", timezone: "Europe/Zurich" },
  { label: "Turkey", region: "Europe", timezone: "Europe/Istanbul" },
  { label: "Cambodia", region: "Asia", timezone: "Asia/Phnom_Penh" },
  { label: "China", region: "Asia", timezone: "Asia/Shanghai" },
  { label: "India", region: "Asia", timezone: "Asia/Kolkata" },
  { label: "Indonesia", region: "Asia", timezone: "Asia/Jakarta" },
  { label: "Japan", region: "Asia", timezone: "Asia/Tokyo" },
  { label: "Malaysia", region: "Asia", timezone: "Asia/Kuala_Lumpur" },
  { label: "Philippines", region: "Asia", timezone: "Asia/Manila" },
  { label: "Singapore", region: "Asia", timezone: "Asia/Singapore" },
  { label: "Thailand", region: "Asia", timezone: "Asia/Bangkok" },
  { label: "Vietnam", region: "Asia", timezone: "Asia/Ho_Chi_Minh" },
  { label: "Australia", region: "Oceania", timezone: "Australia/Sydney" },
  { label: "New Zealand", region: "Oceania", timezone: "Pacific/Auckland" },
  { label: "Argentina", region: "Latin America", timezone: "America/Argentina/Buenos_Aires" },
  { label: "Brazil", region: "Latin America", timezone: "America/Sao_Paulo" },
  { label: "Chile", region: "Latin America", timezone: "America/Santiago" },
  { label: "Colombia", region: "Latin America", timezone: "America/Bogota" },
  { label: "Dominican Republic", region: "Latin America", timezone: "America/Santo_Domingo" },
  { label: "Ecuador", region: "Latin America", timezone: "America/Guayaquil" },
  { label: "Mexico", region: "Latin America", timezone: "America/Mexico_City" },
  { label: "Peru", region: "Latin America", timezone: "America/Lima" },
  { label: "Uruguay", region: "Latin America", timezone: "America/Montevideo" },
  { label: "Egypt", region: "Africa", timezone: "Africa/Cairo" },
  { label: "Morocco", region: "Africa", timezone: "Africa/Casablanca" },
  { label: "South Africa", region: "Africa", timezone: "Africa/Johannesburg" },
];
const monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const accountSizes = ["25000", "50000", "100000", "150000"];
const riskPercents = ["0.5", "1", "2", "3", "4", "5", "10"];
const instrumentGroups = [
  { color: "#3A6EA5", instruments: ["MES", "MNQ", "MYM", "M2K"], label: "Indices", soft: "#E6EDF5" },
  { color: "#8A6A3F", instruments: ["MGC", "SIL"], label: "Metals", soft: "#F2E9D6" },
  { color: "#2F7D57", instruments: ["MCL"], label: "Commodities", soft: "#E5F1EA" },
];
const instrumentPointValues: Record<string, number> = {
  M2K: 5,
  MCL: 1,
  MES: 5,
  MGC: 1,
  MNQ: 2,
  MYM: 0.5,
  SIL: 2.5,
};
const drawdowns: Record<string, number> = { "25000": 1000, "50000": 2000, "100000": 3000, "150000": 4500 };

export default function DashboardFpairWorkspace({ initialDate, mode = "overview", today }: { initialDate?: string; mode?: WorkspaceMode; today: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const initialSnapshot = getLatestFpairSnapshot();
  const [snapshot, setSnapshot] = useState<FpairSnapshot>(initialSnapshot ?? emptySnapshot);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);
  const [statsRange, setStatsRange] = useState<StatsRange>("weekly");
  const [statsTab, setStatsTab] = useState<StatsTab>(mode === "stats" ? "history" : "daily");
  const [, startStatsTransition] = useTransition();
  const [loaded, setLoaded] = useState(Boolean(initialSnapshot));
  const [syncError, setSyncError] = useState<string | null>(null);

  const reload = useCallback(async (currentUserId = userId) => {
    if (!currentUserId) return;
    try {
      const next = await loadFpairSnapshot(currentUserId, { force: true });
      setSnapshot(next);
      setSyncError(null);
    } catch {
      setSyncError("Sync failed. Check the Supabase schema for fpair_ tables.");
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!initialDate) return;
    setSelectedDate(initialDate);
    if (mode === "stats") setStatsTab("history");
  }, [initialDate, mode]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        setSyncError("Supabase unavailable or session expired. Data could not be loaded.");
        setLoaded(true);
        return;
      }

      setUserId(currentUserId);
      try {
        const next = await loadFpairSnapshot(currentUserId, { force: true });
        if (!cancelled) {
          setSnapshot(next);
          setSyncError(null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSyncError("Sync failed. Check the Supabase schema for fpair_ tables.");
          setLoaded(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeFpairChanges(userId, () => void reload(userId));
  }, [reload, userId]);

  useEffect(() => {
    if (mode !== "stats") return undefined;
    const handler = (event: Event) => {
      const date = (event as CustomEvent<string>).detail;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      setSelectedDate(date);
      setStatsTab("history");
    };
    window.addEventListener("fpair:stats-history-date", handler);
    return () => window.removeEventListener("fpair:stats-history-date", handler);
  }, [mode]);

  const progress = useMemo(() => getLevelProgress(snapshot), [snapshot]);
  const breakdown = useMemo(() => getDayBreakdown(snapshot, selectedDate), [snapshot, selectedDate]);
  const activeQuests = useMemo(() => getActiveQuests(snapshot.quests, selectedDate), [snapshot.quests, selectedDate]);
  const tradingStats = useMemo(() => getTradingStats(snapshot), [snapshot]);
  const period = useMemo(() => getPeriod(selectedDate, statsRange), [selectedDate, statsRange]);
  const allTimeStats = useMemo(() => mode === "overview" ? getStats(snapshot, snapshot.settings.startDate || today, today) : emptyPeriodStats(), [mode, snapshot, today]);
  const handleStatsTabChange = useCallback((nextTab: StatsTab) => {
    startStatsTransition(() => {
      setStatsTab(nextTab);
      if (nextTab !== "history") setStatsRange(nextTab);
    });
  }, [startStatsTransition]);
  const handleStatsDateChange = useCallback((date: string) => {
    startStatsTransition(() => setSelectedDate(date));
  }, [startStatsTransition]);

  async function saveAccountWithTransition(nextAccount: Account) {
    const currentAccount = snapshot.accounts.find((account) => account.id === nextAccount.id);
    if (!currentAccount || currentAccount.phase === nextAccount.phase) {
      await saveAccount(userId!, nextAccount);
      return;
    }

    const transition = applyAccountPhaseTransition(currentAccount, nextAccount.phase, snapshot.trades, today);
    await Promise.all([
      saveAccount(userId!, transition.account),
      transition.trade ? saveTrade(userId!, transition.trade) : Promise.resolve(),
    ]);
  }

  async function runSync(action: () => Promise<void>) {
    if (!userId) return;
    try {
      await action();
      await reload(userId);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? ` ${error.message}`
          : typeof error === "object" && error && "message" in error && typeof error.message === "string"
            ? ` ${error.message}`
            : "";
      setSyncError(`Sync failed. The action was not saved.${message}`);
    }
  }

  const shell = (children: ReactNode) => (
    <div className="grid gap-4">
      {!loaded && !initialSnapshot ? (
        <section className="surface p-6 text-sm text-site-muted sm:p-8">Loading fpair_ workspace...</section>
      ) : null}
      {syncError ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {syncError}
        </div>
      ) : null}
      {children}
    </div>
  );

  if (mode === "trades") {
    return shell(
      <TradesWorkspace
        accounts={snapshot.accounts}
        onSaveAccount={(account) => runSync(() => saveAccountWithTransition(account))}
        onSavePropFirm={(plan) => runSync(() => savePropFirmPlan(plan))}
        onSaveTrade={(trade) => runSync(() => saveTrade(userId!, trade))}
        propFirmPlans={snapshot.propFirmPlans}
        selectedDate={selectedDate}
        stats={tradingStats}
        today={today}
        trades={snapshot.trades}
      />,
    );
  }

  if (mode === "journal") {
    return shell(
      <JournalQuestsWorkspace
        activeQuests={activeQuests}
        onDeleteQuest={(questId) => runSync(() => deleteQuest(userId!, questId))}
        onSaveQuest={(quest) => runSync(() => saveQuest(userId!, quest))}
        onSaveResult={(questId, status, value) => runSync(() => saveQuestResult(userId!, selectedDate, questId, status, value))}
        selectedDate={selectedDate}
        snapshot={snapshot}
        today={today}
      />,
    );
  }

  if (mode === "stats") {
    return shell(
      <StatsWorkspace
        activeQuests={activeQuests}
        breakdown={breakdown}
        onTabChange={handleStatsTabChange}
        onSelectedDateChange={handleStatsDateChange}
        period={period}
        range={statsRange}
        selectedDate={selectedDate}
        snapshot={snapshot}
        tab={statsTab}
      />,
    );
  }

  if (mode === "lists") {
    return shell(
      <ListsWorkspace
        items={snapshot.lists}
        onDelete={(itemId) => runSync(() => deleteListItem(userId!, itemId))}
        onSave={(item) => runSync(() => saveListItem(userId!, item))}
        selectedDate={selectedDate}
      />,
    );
  }

  return shell(
    <>
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface-dark flex min-h-[260px] flex-col p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/[0.78]">Profile</p>
              <h2 className="mt-4 text-5xl font-semibold tracking-tight">LV .{progress.level}</h2>
            </div>
          </div>

          <div className="mt-auto border border-white/[0.14] p-3">
            <div className="h-3 overflow-hidden rounded-full bg-white/[0.18]">
              <div
                className="h-full rounded-full bg-[#d9aa62] shadow-[0_0_18px_rgba(217,170,98,0.72)] transition-[width]"
                style={{ width: `${Math.max(progress.score > 0 ? 4 : 0, progress.progress)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/[0.62]">
              <span>Score {progress.score}</span>
              <span>Target {progress.nextLevelScore}</span>
            </div>
          </div>
        </div>

        <div className="surface flex min-h-[260px] flex-col p-6 sm:p-8">
          <p className="eyebrow">Today</p>
          <div className="mt-auto grid grid-cols-2 gap-3">
            <SmallStat label="Green" value={breakdown.green} tone="green" />
            <SmallStat label="Red" value={breakdown.red} tone="red" />
            <SmallStat label="Score" value={breakdown.score} tone={breakdown.score < 0 ? "red" : "green"} />
            <SmallStat label="Ratio" value={formatRoundedNumber(getGreenRedRatio(breakdown.green, breakdown.red))} tone={getGreenRedRatio(breakdown.green, breakdown.red) < 1 ? "red" : "green"} />
          </div>
        </div>

        <SelfCareOverviewPanel snapshot={snapshot} today={today} />
      </section>

      <section className="grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
        <Metric label="Total green" value={allTimeStats.green} />
        <Metric label="Total red" value={allTimeStats.red} tone="red" />
        <Metric label="Ratio" value={formatRoundedNumber(allTimeStats.ratio)} tone={allTimeStats.ratio < 1 ? "red" : "green"} />
        <Metric label="Clean streak" value={allTimeStats.cleanDays} />
        <Metric label="Avg green/day" value={allTimeStats.avgGreenPerDay.toFixed(1)} />
        <Metric label="Avg red/day" value={allTimeStats.avgRedPerDay.toFixed(1)} tone="red" />
        <Metric label="Avg ratio/day" value={formatRoundedNumber(allTimeStats.avgRatioPerDay)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <JournalTasksPanel
          snapshot={snapshot}
          selectedDate={today}
          onSaveStatus={(taskId, completed) =>
            runSync(() => {
              const current = snapshot.journal[today] ?? emptyEntry;
              return saveJournalEntry(userId!, today, {
                ...current,
                activities: [...current.activities],
                wants: current.wants.map((task) => (task.id === taskId ? { ...task, completed } : task)),
              });
            })
          }
        />
        <OverviewQuestsPanel
          activeQuests={getActiveQuests(snapshot.quests, today)}
          selectedDate={today}
          snapshot={snapshot}
          onSaveResult={(questId, status, value) => runSync(() => saveQuestResult(userId!, today, questId, status, value))}
        />
      </section>

      <section className="grid gap-4">
        <ScreenTimeOverviewPanel snapshot={snapshot} today={today} />
        <TradingStatsOnly stats={tradingStats} />
      </section>
    </>,
  );
}

function JournalTasksPanel({
  onSaveStatus,
  selectedDate,
  snapshot,
}: {
  onSaveStatus: (taskId: string, completed: boolean) => void;
  selectedDate: string;
  snapshot: FpairSnapshot;
}) {
  const entry = snapshot.journal[selectedDate];
  const tasks = entry?.wants ?? [];

  return (
    <div className="surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Journal</p>
          <h2 className="mt-2 text-2xl font-semibold">Tasks</h2>
        </div>
        <span className="fp-icon">
          <Check className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-2">
        {tasks.length ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 border bg-site p-3 text-sm",
                task.completed === true && "border-emerald-500/45",
                task.completed === false && "border-red-500/45",
                task.completed === null && "border-site",
              )}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full border",
                  task.completed === true && "border-emerald-500 bg-emerald-500",
                  task.completed === false && "border-red-500 bg-red-500",
                  task.completed === null && "border-site",
                )}
              />
              <span className="min-w-0 truncate">{task.text}</span>
              <div className="grid grid-cols-2 gap-1.5">
                <StatusIcon active={task.completed === true} ariaLabel={`Mark "${task.text}" as done`} tone="green" onClick={() => onSaveStatus(task.id, true)}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                </StatusIcon>
                <StatusIcon active={task.completed === false} ariaLabel={`Mark "${task.text}" as missed`} tone="red" onClick={() => onSaveStatus(task.id, false)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </StatusIcon>
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="No journal task for today." />
        )}
      </div>
    </div>
  );
}

function OverviewQuestsPanel({
  activeQuests,
  onSaveResult,
  selectedDate,
  snapshot,
}: {
  activeQuests: Quest[];
  onSaveResult: (questId: string, status: "open" | "completed" | "failed", value: number | null) => void;
  selectedDate: string;
  snapshot: FpairSnapshot;
}) {
  return (
    <div className="surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Quests</p>
          <h2 className="mt-2 text-2xl font-semibold">Today quests</h2>
        </div>
        <span className="fp-icon">
          <Target className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-1.5">
        {activeQuests.length ? (
          activeQuests.map((quest) => (
            <QuestResultRow
              key={quest.id}
              quest={quest}
              status={getQuestStatus(snapshot, selectedDate, quest.id)}
              value={getQuestValue(snapshot, selectedDate, quest.id)}
              onSave={(status, value) => onSaveResult(quest.id, status, value)}
            />
          ))
        ) : (
          <EmptyState text="No quest planned for today." />
        )}
      </div>
    </div>
  );
}

function StatsWorkspace({
  activeQuests,
  breakdown,
  onTabChange,
  onSelectedDateChange,
  period,
  range,
  selectedDate,
  snapshot,
  tab,
}: {
  activeQuests: Quest[];
  breakdown: ReturnType<typeof getDayBreakdown>;
  onTabChange: (tab: StatsTab) => void;
  onSelectedDateChange: (date: string) => void;
  period: { from: string; to: string };
  range: StatsRange;
  selectedDate: string;
  snapshot: FpairSnapshot;
  tab: StatsTab;
}) {
  const targetLevel = useMemo(() => getLevelProgress(snapshot).level, [snapshot]);
  const buckets = useMemo(() => buildBuckets(period.from, period.to, range), [period.from, period.to, range]);
  const breakdowns = useMemo(() => buildBreakdownCache(snapshot, buckets, targetLevel), [buckets, snapshot, targetLevel]);
  const summary = useMemo(() => buildStatsSummary(snapshot, period.from, period.to, breakdowns), [breakdowns, period.from, period.to, snapshot]);
  const statusStats = useMemo(() => getGroupedStats(buckets, breakdowns), [breakdowns, buckets]);
  const ratioTrend = useMemo(() => buildStatusTrend(buckets, breakdowns), [breakdowns, buckets]);
  const pnlTrend = useMemo(() => buildPnlTrend(snapshot, buckets), [buckets, snapshot]);
  const selfCareTrend = useMemo(() => buildSelfCareTrend(snapshot, buckets), [buckets, snapshot]);
  const periodUnit = getStatsUnit(range);
  const tabItems: Array<[StatsTab, string]> = [
    ["history", "History"],
    ["daily", "Daily"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
    ["yearly", "Yearly"],
  ];
  const tabNav = <Segmented items={tabItems} value={tab} onChange={onTabChange} />;
  const periodControls = (
    <div className="flex w-full items-center gap-2 sm:w-auto lg:justify-self-end">
      <button type="button" className="icon-button" aria-label="Previous period" onClick={() => onSelectedDateChange(shiftPeriod(selectedDate, range, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[15.5rem] border border-site bg-card px-3 py-2 text-center text-sm font-semibold text-site-muted">{period.from} to {period.to}</span>
      <button type="button" className="icon-button" aria-label="Next period" onClick={() => onSelectedDateChange(shiftPeriod(selectedDate, range, 1))}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  if (tab === "history") {
    return (
      <div className="grid gap-4">
        <section className="grid min-h-11 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">{tabNav}</div>
          <div className="hidden min-h-11 w-[23rem] lg:block" aria-hidden="true" />
        </section>
        <CalendarHistoryDetail activeQuests={activeQuests} breakdown={breakdown} selectedDate={selectedDate} snapshot={snapshot} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid min-h-11 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">{tabNav}</div>
        {periodControls}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="surface p-6 sm:p-8">
          <p className="eyebrow">Status</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Total green" value={statusStats.green} />
            <Metric label="Total red" value={statusStats.red} tone="red" />
            <Metric label="Ratio" value={formatRoundedNumber(statusStats.ratio)} tone={statusStats.ratio < 1 ? "red" : "green"} />
            <Metric label="Clean streak" value={statusStats.cleanPeriods} />
            <Metric label={`Avg green/${periodUnit}`} value={formatRoundedNumber(statusStats.avgGreen)} />
            <Metric label={`Avg red/${periodUnit}`} value={formatRoundedNumber(statusStats.avgRed)} tone="red" />
            <Metric label={`Avg ratio/${periodUnit}`} value={formatRoundedNumber(statusStats.avgRatio)} />
          </div>
        </div>
        <div className="surface p-6 sm:p-8">
          <p className="eyebrow">Self-care</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Metric label="Avg sleep" value={formatDurationHours(summary.selfCare.avgSleepHours)} />
            <Metric label="Avg screen time" value={formatDurationHours(summary.selfCare.avgScreenHours)} tone={summary.selfCare.avgScreenHours > snapshot.profile.screenTimeRedMinutes / 60 ? "red" : "green"} />
            <Metric label="Avg run" value={`${formatRoundedNumber(summary.selfCare.avgRunKm)} km`} />
            <Metric label="Avg calories" value={`${Math.round(summary.selfCare.avgCalories)} kcal`} />
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <SourcePieChart title="Journal" green={summary.sources.journal.green} red={summary.sources.journal.red} />
          <SourcePieChart title="Quests" green={summary.sources.quests.green} red={summary.sources.quests.red} />
          <SourcePieChart title="Self-care" green={summary.sources.selfCare.green} red={summary.sources.selfCare.red} />
        </div>
        <div className="surface p-6 sm:p-8">
          <p className="eyebrow">Trading</p>
          <h2 className="mt-2 text-2xl font-semibold">Period execution</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Metric label="Trades" value={summary.trading.trades} />
            <Metric label="Wins" value={summary.trading.wins} tone="green" />
            <Metric label="Losses" value={summary.trading.losses} tone="red" />
            <Metric label="Win rate" value={`${summary.trading.winRate}%`} />
            <Metric label="P&L" value={formatMoney(summary.trading.pnl)} tone={summary.trading.pnl < 0 ? "red" : "green"} />
            <Metric label="Avg P&L" value={formatMoney(summary.trading.avgPnl)} tone={summary.trading.avgPnl < 0 ? "red" : "green"} />
          </div>
        </div>
      </section>
      <section className="grid gap-4">
        <StatsChartCard
          title="Ratio evolution"
          eyebrow="Curve"
          series={[
            { color: "#a4772b", formatValue: formatRoundedNumber, key: "ratio", label: "Ratio" },
            { color: "#047857", formatValue: formatRoundedNumber, key: "green", label: "Green" },
            { color: "#b91c1c", formatValue: formatRoundedNumber, key: "red", label: "Red" },
          ]}
          points={ratioTrend}
        />
        <StatsChartCard
          title="P&L evolution"
          eyebrow="Curve"
          series={[
            { color: "#a4772b", formatValue: formatMoney, key: "pnl", label: "Period P&L" },
            { color: "#047857", formatValue: formatMoney, key: "cumulative", label: "Cumulative P&L" },
          ]}
          points={pnlTrend}
        />
        <StatsChartCard
          title="Self-care evolution"
          eyebrow="Curve"
          series={[
            { color: "#3A6EA5", formatValue: formatDurationHours, key: "sleep", label: "Avg sleep" },
            { color: "#b91c1c", formatValue: formatDurationHours, key: "screen", label: "Avg screen" },
            { color: "#047857", formatValue: (value) => `${formatRoundedNumber(value)} km`, key: "run", label: "Avg run" },
            { color: "#a4772b", formatValue: (value) => `${Math.round(value * 1000)} kcal`, key: "calories", label: "Avg calories" },
          ]}
          points={selfCareTrend}
        />
      </section>
    </div>
  );
}

type ChartPoint = {
  label: string;
  [key: string]: number | string;
};

type ChartSeries = {
  color: string;
  formatValue?: (value: number) => string;
  key: string;
  label: string;
};

function SourcePieChart({ green, red, title }: { green: number; red: number; title: string }) {
  const ratio = getGreenRedRatio(green, red);
  const hasData = green + red > 0;
  const data = hasData
    ? [
        { color: "#047857", name: "Green", value: green },
        { color: "#b91c1c", name: "Red", value: red },
      ]
    : [{ color: "rgba(28,28,27,0.16)", name: "No data", value: 1 }];

  return (
    <div className="bg-site p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className={cn("mt-1 text-xs font-semibold uppercase tracking-[0.12em]", ratio < 1 ? "text-red-700" : "text-emerald-700")}>
            Ratio {formatRoundedNumber(ratio)}
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-site-muted">
          <p><span className="text-emerald-700">{green}</span> green</p>
          <p><span className="text-red-700">{red}</span> red</p>
        </div>
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="58%" isAnimationActive={false} outerRadius="84%" paddingAngle={hasData ? 2 : 0} stroke="none">
              {data.map((item) => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgb(250,248,244)",
                border: "1px solid rgba(28,28,27,0.16)",
                borderRadius: 0,
                color: "rgb(28,28,27)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function StatsChartCard({ eyebrow, points, series, title }: { eyebrow: string; points: ChartPoint[]; series: ChartSeries[]; title: string }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-site-muted">
          {series.map((item) => <LegendDot key={item.key} color={item.color} label={item.label} />)}
        </div>
      </div>
      <StatsTrendChart points={points} series={series} />
    </section>
  );
}

function StatsTrendChart({ points, series }: { points: ChartPoint[]; series: ChartSeries[] }) {
  const chartData = points.map((point, index) => ({ ...point, xKey: String(index), xLabel: point.label }));
  const values = points.flatMap((point) => series.map((item) => numericChartValue(point[item.key])));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const padding = Math.max(1, (maxValue - minValue) * 0.12);
  const domain: [number, number] = [minValue - padding, maxValue + padding];

  return (
    <div className="mt-4 h-[250px] overflow-hidden border border-site bg-site px-2 py-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ bottom: 12, left: 0, right: 10, top: 10 }}>
          <CartesianGrid stroke="rgba(28,28,27,0.08)" vertical={false} />
          <ReferenceLine y={0} stroke="rgba(28,28,27,0.2)" strokeWidth={1} />
          <XAxis
            axisLine={{ stroke: "rgba(28,28,27,0.14)" }}
            dataKey="xKey"
            interval={0}
            minTickGap={0}
            padding={{ left: 0, right: 0 }}
            tick={{ fill: "rgb(87,82,74)", fontSize: 10, fontWeight: 700 }}
            tickFormatter={(value) => chartData[Number(value)]?.xLabel ?? String(value)}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            domain={domain}
            tick={{ fill: "rgb(120,113,103)", fontSize: 10 }}
            tickLine={false}
            tickMargin={8}
            width={34}
          />
          <Tooltip
            cursor={{ stroke: "rgba(28,28,27,0.16)", strokeWidth: 1 }}
            formatter={(value, name, item) => {
              const dataKey = String((item as { dataKey?: unknown }).dataKey ?? "");
              const chartSeries = series.find((seriesItem) => seriesItem.key === dataKey);
              const numericValue = numericChartValue(value as number | string | undefined);
              return [chartSeries?.formatValue ? chartSeries.formatValue(numericValue) : formatRoundedNumber(numericValue), chartSeries?.label ?? name];
            }}
            labelFormatter={(value) => chartData[Number(value)]?.xLabel ?? String(value)}
            contentStyle={{
              background: "rgb(250,248,244)",
              border: "1px solid rgba(28,28,27,0.16)",
              borderRadius: 0,
              boxShadow: "0 14px 40px rgba(28,28,27,0.08)",
              color: "rgb(28,28,27)",
              fontSize: 12,
            }}
          />
          {series.map((item) => (
            <Line
              key={item.key}
              activeDot={{ r: 4, strokeWidth: 0 }}
              dataKey={item.key}
              dot={{ r: 2, strokeWidth: 0 }}
              isAnimationActive={false}
              name={item.label}
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function numericChartValue(value: number | string | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatRoundedNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getGreenRedRatio(green: number, red: number) {
  if (red === 0) return green > 0 ? green : 0;
  return green / red;
}

function formatDurationHours(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0h00min";
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}min`;
}

function formatDurationSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0min";
  const totalMinutes = Math.round(value / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}min` : `${minutes}min`;
}

type CachedBreakdowns = Map<string, ReturnType<typeof getDayBreakdown>>;

function buildBreakdownCache(snapshot: FpairSnapshot, buckets: Array<{ from: string; to: string }>, targetLevel: number): CachedBreakdowns {
  const cache: CachedBreakdowns = new Map();

  buckets.forEach((bucket) => {
    enumerateDates(bucket.from, bucket.to).forEach((date) => {
      if (!cache.has(date)) {
        cache.set(date, snapshot.settings.startDate && date < snapshot.settings.startDate ? emptyBreakdownValue() : getDayBreakdownForLevel(snapshot, date, targetLevel));
      }
    });
  });

  return cache;
}

function emptyBreakdownValue(): ReturnType<typeof getDayBreakdown> {
  return {
    conversion: 0,
    green: 0,
    journal: { green: 0, red: 0 },
    quests: { green: 0, red: 0 },
    red: 0,
    score: 0,
    selfCare: { calories: null, green: 0, red: 0, run: null, screen: null, sleep: null },
  };
}

function emptyPeriodStats(): ReturnType<typeof getStats> {
  return {
    avgGreenPerDay: 0,
    avgRatioPerDay: 0,
    avgRedPerDay: 0,
    cleanDays: 0,
    conversion: 0,
    green: 0,
    ratio: 0,
    red: 0,
  };
}

function getCachedBreakdown(cache: CachedBreakdowns, date: string) {
  return cache.get(date) ?? emptyBreakdownValue();
}

function getCachedStats(cache: CachedBreakdowns, from: string, to: string) {
  const stats = enumerateDates(from, to).reduce(
    (acc, date) => {
      const breakdown = getCachedBreakdown(cache, date);
      acc.green += breakdown.green;
      acc.red += breakdown.red;
      acc.ratioTotal += getGreenRedRatio(breakdown.green, breakdown.red);
      acc.dayCount += 1;
      if (breakdown.green > breakdown.red) acc.cleanPeriods += 1;
      return acc;
    },
    { cleanPeriods: 0, dayCount: 0, green: 0, ratioTotal: 0, red: 0 },
  );

  return {
    cleanPeriods: stats.cleanPeriods,
    dayCount: stats.dayCount,
    green: stats.green,
    ratio: getGreenRedRatio(stats.green, stats.red),
    ratioTotal: stats.ratioTotal,
    red: stats.red,
  };
}

function buildStatsSummary(snapshot: FpairSnapshot, from: string, to: string, breakdowns: CachedBreakdowns) {
  const dates = enumerateDates(from, to);
  const divisor = Math.max(1, dates.length);
  const selfCare = dates.reduce(
    (acc, date) => {
      const health = snapshot.health[date];
      if (!health) return acc;
      acc.days += 1;
      acc.sleep += health.sleepHours ?? 0;
      acc.sleepCount += health.sleepHours == null ? 0 : 1;
      acc.screen += health.screenTimeHours;
      acc.run += health.runKm ?? 0;
      acc.runCount += health.runKm == null ? 0 : 1;
      acc.calories += health.calories ?? 0;
      acc.caloriesCount += health.calories == null ? 0 : 1;
      return acc;
    },
    { calories: 0, caloriesCount: 0, days: 0, run: 0, runCount: 0, screen: 0, sleep: 0, sleepCount: 0 },
  );
  const sources = dates.reduce(
    (acc, date) => {
      const breakdown = getCachedBreakdown(breakdowns, date);
      acc.journal.green += breakdown.journal.green;
      acc.journal.red += breakdown.journal.red;
      acc.quests.green += breakdown.quests.green;
      acc.quests.red += breakdown.quests.red;
      acc.selfCare.green += breakdown.selfCare.green;
      acc.selfCare.red += breakdown.selfCare.red;
      return acc;
    },
    {
      journal: { green: 0, red: 0 },
      quests: { green: 0, red: 0 },
      selfCare: { green: 0, red: 0 },
    },
  );
  const periodTrades = snapshot.trades.filter((trade) => trade.date >= from && trade.date <= to);
  const pnl = periodTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = periodTrades.filter((trade) => trade.pnl > 0).length;
  const losses = periodTrades.filter((trade) => trade.pnl < 0).length;

  return {
    selfCare: {
      avgCalories: selfCare.calories / Math.max(1, selfCare.caloriesCount),
      avgRunKm: selfCare.run / Math.max(1, selfCare.runCount),
      avgScreenHours: selfCare.screen / Math.max(1, selfCare.days || divisor),
      avgSleepHours: selfCare.sleep / Math.max(1, selfCare.sleepCount),
    },
    sources,
    trading: {
      avgPnl: pnl / Math.max(1, periodTrades.length),
      losses,
      pnl,
      trades: periodTrades.length,
      wins,
      winRate: periodTrades.length ? Math.round((wins / periodTrades.length) * 100) : 0,
    },
  };
}

function buildStatusTrend(buckets: Array<{ from: string; label: string; to: string }>, breakdowns: CachedBreakdowns): ChartPoint[] {
  return buckets.map((bucket) => {
    const stats = getCachedStats(breakdowns, bucket.from, bucket.to);
    return { green: stats.green, label: bucket.label, ratio: stats.ratio, red: stats.red };
  });
}

function buildPnlTrend(snapshot: FpairSnapshot, buckets: Array<{ from: string; label: string; to: string }>): ChartPoint[] {
  let cumulative = 0;
  return buckets.map((bucket) => {
    const pnl = snapshot.trades
      .filter((trade) => trade.date >= bucket.from && trade.date <= bucket.to)
      .reduce((sum, trade) => sum + trade.pnl, 0);
    cumulative += pnl;
    return { cumulative, label: bucket.label, pnl };
  });
}

function buildSelfCareTrend(snapshot: FpairSnapshot, buckets: Array<{ from: string; label: string; to: string }>): ChartPoint[] {
  return buckets.map((bucket) => {
    const days = enumerateDates(bucket.from, bucket.to);
    const totals = days.reduce(
      (acc, date) => {
        const health = snapshot.health[date];
        if (!health) return acc;
        acc.days += 1;
        acc.sleep += health.sleepHours ?? 0;
        acc.sleepCount += health.sleepHours == null ? 0 : 1;
        acc.screen += health.screenTimeHours;
        acc.run += health.runKm ?? 0;
        acc.runCount += health.runKm == null ? 0 : 1;
        acc.calories += health.calories ?? 0;
        acc.caloriesCount += health.calories == null ? 0 : 1;
        return acc;
      },
      { calories: 0, caloriesCount: 0, days: 0, run: 0, runCount: 0, screen: 0, sleep: 0, sleepCount: 0 },
    );
    return {
      calories: totals.calories / Math.max(1, totals.caloriesCount) / 1000,
      label: bucket.label,
      run: totals.run / Math.max(1, totals.runCount),
      screen: totals.screen / Math.max(1, totals.days),
      sleep: totals.sleep / Math.max(1, totals.sleepCount),
    };
  });
}

function buildBuckets(from: string, to: string, range: StatsRange) {
  const dates = enumerateDates(from, to);
  if (range === "daily") {
    const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    return dates.slice(0, 7).map((date, index) => ({ from: date, label: weekdayLabels[index] ?? formatWeekday(date).slice(0, 1), to: date }));
  }

  if (range === "weekly") {
    return chunkDatesIntoCount(dates, 5).map((bucket, index) => ({
      from: bucket[0],
      label: `W${index + 1}`,
      to: bucket[bucket.length - 1],
    }));
  }

  if (range === "monthly") {
    const year = Number(from.slice(0, 4));
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(year, index, 1);
      const start = toIsoDate(date);
      const end = toIsoDate(new Date(year, index + 1, 0));
      return { from: start, label: monthInitials[index], to: end };
    });
  }

  const startYear = Number(from.slice(0, 4));
  return Array.from({ length: 5 }, (_, index) => {
    const year = startYear + index;
    return { from: `${year}-01-01`, label: `Y${index + 1}`, to: `${year}-12-31` };
  });
}

function chunkDatesIntoCount(dates: string[], count: number) {
  if (!dates.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * dates.length) / count);
    const end = Math.floor(((index + 1) * dates.length) / count);
    const bucket = dates.slice(start, Math.max(start + 1, end));
    return bucket.length ? bucket : [dates[dates.length - 1]];
  });
}

function getPeriod(date: string, range: StatsRange) {
  const parsed = new Date(`${date}T00:00:00`);

  if (range === "daily") {
    const mondayOffset = (parsed.getDay() + 6) % 7;
    parsed.setDate(parsed.getDate() - mondayOffset);
    return { from: toIsoDate(parsed), to: shiftDate(toIsoDate(parsed), 6) };
  }

  if (range === "weekly") {
    const from = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
    const to = toIsoDate(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0));
    return { from, to };
  }

  if (range === "monthly") {
    const year = parsed.getFullYear();
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  const year = parsed.getFullYear();
  const startYear = year - (year % 5);
  return { from: `${startYear}-01-01`, to: `${startYear + 4}-12-31` };
}

function getGroupedStats(buckets: Array<{ from: string; to: string }>, breakdowns: CachedBreakdowns) {
  const bucketStats = buckets.map((bucket) => getCachedStats(breakdowns, bucket.from, bucket.to));
  const totals = bucketStats.reduce(
    (acc, stats) => {
      acc.cleanPeriods += stats.green > stats.red ? 1 : 0;
      acc.green += stats.green;
      acc.ratioTotal += stats.ratio;
      acc.red += stats.red;
      return acc;
    },
    { cleanPeriods: 0, green: 0, ratioTotal: 0, red: 0 },
  );
  const divisor = Math.max(1, buckets.length);

  return {
    cleanPeriods: totals.cleanPeriods,
    green: totals.green,
    ratio: getGreenRedRatio(totals.green, totals.red),
    red: totals.red,
    avgGreen: totals.green / divisor,
    avgRatio: totals.ratioTotal / divisor,
    avgRed: totals.red / divisor,
  };
}

function getStatsUnit(range: StatsRange) {
  if (range === "daily") return "day";
  if (range === "weekly") return "week";
  if (range === "monthly") return "month";
  return "year";
}

function shiftPeriod(date: string, range: StatsRange, offset: number) {
  const parsed = new Date(`${date}T00:00:00`);
  if (range === "daily") parsed.setDate(parsed.getDate() + offset * 7);
  if (range === "weekly") parsed.setMonth(parsed.getMonth() + offset);
  if (range === "monthly") parsed.setFullYear(parsed.getFullYear() + offset);
  if (range === "yearly") parsed.setFullYear(parsed.getFullYear() + offset * 5);
  return toIsoDate(parsed);
}

function getCleanStreakAtDate(snapshot: FpairSnapshot, selectedDate: string) {
  let streak = 0;
  let cursor = selectedDate;
  const startDate = snapshot.settings.startDate || "";

  for (let index = 0; index < 3650; index += 1) {
    if (startDate && cursor < startDate) break;
    const breakdown = getDayBreakdown(snapshot, cursor);
    if (breakdown.green <= breakdown.red) break;
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

type JournalFpairTab = "journal" | "diary" | "quests" | "library" | "planned";

function JournalQuestsWorkspace({
  activeQuests,
  onDeleteQuest,
  onSaveQuest,
  onSaveResult,
  selectedDate,
  snapshot,
  today,
}: {
  activeQuests: Quest[];
  onDeleteQuest: (questId: string) => void;
  onSaveQuest: (quest: Quest) => void;
  onSaveResult: (questId: string, status: "open" | "completed" | "failed", value: number | null) => void;
  selectedDate: string;
  snapshot: FpairSnapshot;
  today: string;
}) {
  const [tab, setTab] = useState<JournalFpairTab>("journal");
  const [diaryMode, setDiaryMode] = useState<"write" | "feed">("write");

  return (
    <div className="grid gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            items={[
              ["journal", "Journal"],
              ["quests", "Quests"],
              ["diary", "Diary"],
              ["library", "Library"],
              ["planned", "Planned"],
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "diary" ? (
            <Segmented items={[["write", "Write"], ["feed", "View"]]} value={diaryMode} onChange={setDiaryMode} />
          ) : null}
        </div>
        <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{formatLongDate(selectedDate)}</h2>
      </section>

      {tab === "journal" ? (
        <DashboardJournal forcedTab="write" hideTabs selectedDate={selectedDate} today={today} />
      ) : tab === "diary" ? (
        <DashboardJournal forcedDiaryMode={diaryMode} forcedTab="diary" hideTabs selectedDate={selectedDate} today={today} />
      ) : tab === "quests" ? (
        <OverviewQuestsPanel activeQuests={activeQuests} onSaveResult={onSaveResult} selectedDate={selectedDate} snapshot={snapshot} />
      ) : tab === "library" ? (
        <QuestLibraryPanel onDeleteQuest={onDeleteQuest} onSaveQuest={onSaveQuest} snapshot={snapshot} />
      ) : (
        <CalendarPlanned selectedDate={selectedDate} snapshot={snapshot} today={today} />
      )}
    </div>
  );
}

function QuestLibraryPanel({
  editingQuest: controlledEditingQuest,
  onDeleteQuest,
  onEditQuest,
  onSaveQuest,
  snapshot,
}: {
  editingQuest?: Quest | null;
  onDeleteQuest: (questId: string) => void;
  onEditQuest?: (quest: Quest | null) => void;
  onSaveQuest: (quest: Quest) => void;
  snapshot: FpairSnapshot;
}) {
  const [internalEditingQuest, setInternalEditingQuest] = useState<Quest | null>(null);
  const editingQuest = controlledEditingQuest === undefined ? internalEditingQuest : controlledEditingQuest;
  const setEditingQuest = onEditQuest ?? setInternalEditingQuest;

  return (
    <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <QuestForm key={editingQuest?.id ?? "new"} quest={editingQuest} onCancel={() => setEditingQuest(null)} onSave={(quest) => {
        onSaveQuest(quest);
        setEditingQuest(null);
      }} />
      <div className="surface p-6 sm:p-8">
        <p className="eyebrow">Quests</p>
        <h2 className="mt-2 text-2xl font-semibold">Library</h2>
        <div className="mt-5 grid gap-2">
          {snapshot.quests.length ? snapshot.quests.map((quest) => (
            <div key={quest.id} className="grid gap-3 border border-site bg-site p-3 text-sm lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <span>
                <span className="font-semibold">{quest.title}</span>
                <span className="text-site-muted"> / {quest.category} / {quest.cadence} / {quest.condition}</span>
              </span>
              <button type="button" className="border border-site bg-card px-3 py-2 font-semibold text-site-muted transition hover:text-site" onClick={() => setEditingQuest(quest)}>
                Edit
              </button>
              <button type="button" className="border border-site bg-card px-3 py-2 font-semibold text-site-muted transition hover:text-site" onClick={() => onSaveQuest({ ...quest, active: !quest.active })}>
                {quest.active ? "Active" : "Paused"}
              </button>
              <button type="button" className="border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700" onClick={() => onDeleteQuest(quest.id)}>
                Delete
              </button>
            </div>
          )) : <EmptyState text="No quest created yet." />}
        </div>
      </div>
    </section>
  );
}

function QuestForm({ onCancel, onSave, quest }: { onCancel?: () => void; onSave: (quest: Quest) => void; quest?: Quest | null }) {
  const [title, setTitle] = useState(quest?.title ?? "");
  const [category, setCategory] = useState<Quest["category"]>(quest?.category ?? "discipline");
  const [cadence, setCadence] = useState<Quest["cadence"]>(quest?.cadence ?? "daily");
  const [condition, setCondition] = useState<Quest["condition"]>(quest?.condition ?? "to_do");
  const [target, setTarget] = useState(quest?.target == null ? "" : String(quest.target));
  const isEditing = Boolean(quest);

  return (
    <section className="surface p-6 sm:p-8">
      <p className="eyebrow">{isEditing ? "Edit" : "Create"}</p>
      <h2 className="mt-2 text-2xl font-semibold">{isEditing ? "Edit quest" : "New quest"}</h2>
      <div className="mt-5 grid gap-3">
        <input aria-label="Quest title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quest title" />
        <Select ariaLabel="Quest category" value={category} onChange={(value) => setCategory(value as Quest["category"])} options={questCategories} />
        <Select ariaLabel="Quest cadence" value={cadence} onChange={(value) => setCadence(value as Quest["cadence"])} options={["daily", "weekly", "monthly", "one_off"]} />
        <Select ariaLabel="Quest condition" value={condition} onChange={(value) => setCondition(value as Quest["condition"])} options={["to_do", "to_not_do", "reach_target", "stay_under"]} />
        <input aria-label="Quest target" className="form-input" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target" type="number" disabled={condition === "to_do" || condition === "to_not_do"} />
        <button
          type="button"
          className="btn-primary justify-center"
          onClick={() => {
            const trimmed = title.trim();
            if (!trimmed) return;
            const next = createQuest({
              ...(quest ?? {}),
              title: trimmed,
              category,
              cadence,
              condition,
              target: condition === "to_do" || condition === "to_not_do" || !target ? null : Number(target),
            });
            onSave(next);
            setTitle("");
            setTarget("");
          }}
        >
          <Plus className="h-4 w-4" />
          {isEditing ? "Update quest" : "Create quest"}
        </button>
        {isEditing && onCancel ? (
          <button type="button" className="border border-site bg-card px-3 py-2 font-semibold text-site-muted transition hover:text-site" onClick={onCancel}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </section>
  );
}

type ListMainTab = "goals" | "todo" | "buy" | "watch" | "read";

const listMainTabs: Array<[ListMainTab, string]> = [
  ["goals", "GOALS"],
  ["todo", "To do"],
  ["buy", "To buy"],
  ["watch", "To watch"],
  ["read", "To read"],
];

const goalListTabs: Array<[ListType, string]> = [
  ["goals_1m", "1 month"],
  ["goals_3m", "3 months"],
  ["goals_6m", "6 months"],
  ["goals_12m", "12 months"],
];

function ListsWorkspace({
  items,
  onDelete,
  onSave,
  selectedDate,
}: {
  items: ListItem[];
  onDelete: (itemId: string) => void;
  onSave: (item: ListItem) => void;
  selectedDate: string;
}) {
  const [mainTab, setMainTab] = useState<ListMainTab>("goals");
  const [goalTab, setGoalTab] = useState<ListType>("goals_1m");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const activeListType: ListType = mainTab === "goals" ? goalTab : mainTab;
  const activeLabel = mainTab === "goals"
    ? goalListTabs.find(([value]) => value === goalTab)?.[1] ?? "Goals"
    : listMainTabs.find(([value]) => value === mainTab)?.[1] ?? "List";
  const visibleItems = items.filter((item) => item.listType === activeListType);
  const openItems = visibleItems.filter((item) => !item.completed);
  const completedItems = visibleItems.filter((item) => item.completed);
  const renderItem = (item: ListItem) => (
    <div key={item.id} className="grid gap-2 border border-site bg-site p-2.5 text-sm xl:grid-cols-[auto_1fr] xl:items-start">
      <button
        type="button"
        aria-label={item.completed ? `Mark "${item.title}" as open` : `Mark "${item.title}" as completed`}
        aria-pressed={item.completed}
        className={cn("grid h-7 w-7 place-items-center border", item.completed ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-site bg-card text-site-muted")}
        onClick={() => onSave({ ...item, completed: !item.completed })}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <div className="min-w-0">
        <span className={cn("block font-semibold leading-5", item.completed && "line-through opacity-60")}>{item.title}</span>
        {item.detail ? <span className="mt-0.5 block text-xs leading-5 text-site-muted">{item.detail}</span> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-auto text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-site-muted">
            Added {formatShortDate(item.createdAt.slice(0, 10))}
          </span>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 border border-site bg-card px-2 text-xs font-semibold text-site-muted transition hover:text-site"
            onClick={() => {
              setEditingItem(item);
              setTitle(item.title);
              setDetail(item.detail);
            }}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button type="button" className="h-7 border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700" onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented items={listMainTabs} value={mainTab} onChange={setMainTab} />
          {mainTab === "goals" ? <Segmented items={goalListTabs} value={goalTab} onChange={setGoalTab} /> : null}
        </div>
        <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{formatLongDate(selectedDate)}</h2>
      </section>
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="surface p-6 sm:p-8">
          <p className="eyebrow">My lists</p>
          <h2 className="mt-2 text-2xl font-semibold">{editingItem ? "Edit item" : activeLabel}</h2>
          <div className="mt-5 grid gap-3">
            <input aria-label="List item title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            <textarea aria-label="List item details" className="form-input min-h-24 resize-y" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Details" />
            <button
              type="button"
              className="btn-primary justify-center"
              onClick={() => {
                const trimmed = title.trim();
                if (!trimmed) return;
                onSave(editingItem
                  ? {
                      ...editingItem,
                      detail: detail.trim(),
                      title: trimmed,
                    }
                  : {
                      completed: false,
                      createdAt: new Date().toISOString(),
                      detail: detail.trim(),
                      id: `list-${Date.now()}-${Math.round(Math.random() * 10000)}`,
                      listType: activeListType,
                      position: items.length,
                      title: trimmed,
                    });
                setEditingItem(null);
                setTitle("");
                setDetail("");
              }}
            >
              {editingItem ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingItem ? "Save changes" : "Add item"}
            </button>
            {editingItem ? (
              <button
                type="button"
                className="border border-site bg-card px-3 py-2 font-semibold text-site-muted transition hover:text-site"
                onClick={() => {
                  setEditingItem(null);
                  setTitle("");
                  setDetail("");
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
        <div className="surface p-6 sm:p-8">
          <p className="eyebrow">Items</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="grid content-start gap-2">
              <div className="flex items-center justify-between gap-3 border-b border-site pb-2">
                <h3 className="text-sm font-semibold">Open</h3>
                <span className="text-xs font-semibold text-site-muted">{openItems.length}</span>
              </div>
              {openItems.length ? openItems.map(renderItem) : <EmptyState text="No open item." />}
            </div>
            <div className="grid content-start gap-2">
              <div className="flex items-center justify-between gap-3 border-b border-site pb-2">
                <h3 className="text-sm font-semibold">Completed</h3>
                <span className="text-xs font-semibold text-site-muted">{completedItems.length}</span>
              </div>
              {completedItems.length ? completedItems.map(renderItem) : <EmptyState text="No completed item." />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TradingStatsOnly({ flat = false, stats }: { flat?: boolean; stats: ReturnType<typeof getTradingStats> }) {
  return (
    <div className={cn(flat ? "surface-flat p-1 sm:p-2" : "surface p-6 sm:p-8")}>
      <p className="eyebrow">Accounts and execution</p>
      <h2 className="mt-2 text-2xl font-semibold">Trading stats</h2>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
        <Metric label="Total accounts" value={stats.totalAccounts} />
        <Metric label="Active" value={stats.activeAccounts} />
        <Metric label="Funded" value={stats.fundedAccounts} />
        <Metric label="Eval blown" value={stats.blownEvaluation} tone="red" />
        <Metric label="Funded blown" value={stats.blownFunded} tone="red" />
        <Metric label="Total PNL" value={formatMoney(stats.totalPnl)} tone={stats.totalPnl < 0 ? "red" : "green"} />
        <Metric label="Win rate" value={`${stats.winRate}%`} />
      </div>
    </div>
  );
}

function ScreenTimeOverviewPanel({ snapshot, today }: { snapshot: FpairSnapshot; today: string }) {
  const todayRows = snapshot.screenTime.filter((row) => row.date === today);
  const allRows = snapshot.screenTime;
  const totalTodaySeconds = todayRows.reduce((sum, row) => sum + row.activeSeconds, 0);
  const totalAllSeconds = allRows.reduce((sum, row) => sum + row.activeSeconds, 0);
  const totalTodayClicks = todayRows.reduce((sum, row) => sum + row.clickCount, 0);
  const totalTodaySwitches = todayRows.reduce((sum, row) => sum + row.tabSwitches, 0);
  const todayHours = totalTodaySeconds / 3600;
  const avgSecondsPerDomain = todayRows.length ? totalTodaySeconds / todayRows.length : 0;
  const topDomains = todayRows
    .slice()
    .sort((left, right) => right.activeSeconds - left.activeSeconds)
    .slice(0, 6);

  return (
    <div className="surface p-6 sm:p-8">
      <p className="eyebrow">Chrome screen time</p>
      <h2 className="mt-2 text-2xl font-semibold">Active tabs</h2>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Today" value={formatDurationSeconds(totalTodaySeconds)} />
        <Metric label="All time" value={formatDurationSeconds(totalAllSeconds)} />
        <Metric label="Domains today" value={topDomains.length} />
        <Metric label="Tab switches" value={totalTodaySwitches} />
        <Metric label="Clicks" value={totalTodayClicks} />
        <Metric label="Avg/domain" value={formatDurationSeconds(avgSecondsPerDomain)} />
        <Metric label="Clicks/hour" value={todayHours ? formatRoundedNumber(totalTodayClicks / todayHours) : 0} />
        <Metric label="Switch/hour" value={todayHours ? formatRoundedNumber(totalTodaySwitches / todayHours) : 0} />
      </div>
      <div className="mt-5 grid gap-2">
        {topDomains.length ? topDomains.map((row) => (
          <div key={`${row.date}-${row.domain}`} className="grid gap-3 border-b border-site py-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate font-semibold">{row.domain}</p>
              <p className="text-xs text-site-muted">{row.clickCount} clicks / {row.tabSwitches} switches</p>
            </div>
            <span className="text-site-muted">{formatDurationSeconds(row.activeSeconds)}</span>
          </div>
        )) : <EmptyState text="No Chrome screen time synced today." />}
      </div>
    </div>
  );
}

function TradesWorkspace({
  accounts,
  onSaveAccount,
  onSavePropFirm,
  onSaveTrade,
  propFirmPlans,
  selectedDate,
  stats,
  today,
  trades,
}: {
  accounts: Account[];
  onSaveAccount: (account: Account) => void;
  onSavePropFirm: Parameters<typeof AddPropFirmForm>[0]["onSave"];
  onSaveTrade: (trade: ReturnType<typeof createTrade>) => void;
  propFirmPlans: PropFirmPlan[];
  selectedDate: string;
  stats: ReturnType<typeof getTradingStats>;
  today: string;
  trades: FpairSnapshot["trades"];
}) {
  const [tab, setTab] = useState<TradesSubTab>("trades");

  return (
    <div className="grid gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={[
            ["trades", "Trades"],
            ["accounts", "Accounts"],
            ["session-risk", "Session & Risk"],
          ]}
          value={tab}
          onChange={setTab}
        />
        <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{formatLongDate(selectedDate)}</h2>
      </section>

      {tab === "trades" ? (
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <TradeForm accounts={accounts} onSaveTrade={onSaveTrade} today={today} trades={trades} />
          <div className="grid gap-4">
            <TradingStatsOnly stats={stats} flat />
            <TradeHistory trades={trades} />
          </div>
        </section>
      ) : null}

      {tab === "accounts" ? (
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-0">
            <AccountForm onSaveAccount={onSaveAccount} plans={propFirmPlans} />
            <AddPropFirmForm onSave={onSavePropFirm} />
          </div>
          <AccountsPanel accounts={accounts} onSaveAccount={onSaveAccount} stats={stats} />
        </section>
      ) : null}

      {tab === "session-risk" ? <SessionRiskPanel /> : null}
    </div>
  );
}

function CalendarHistoryDetail({
  activeQuests,
  breakdown,
  selectedDate,
  snapshot,
}: {
  activeQuests: Quest[];
  breakdown: ReturnType<typeof getDayBreakdown>;
  selectedDate: string;
  snapshot: FpairSnapshot;
}) {
  const entry = snapshot.journal[selectedDate];
  const trades = snapshot.trades.filter((trade) => trade.date === selectedDate);
  const streak = getCleanStreakAtDate(snapshot, selectedDate);

  return (
    <div className="surface-flat p-1 sm:p-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold">{formatLongDate(selectedDate)}</h2>
          <span className="border border-[#0f4fa8] bg-[#0f4fa8]/10 px-3 py-1 text-sm font-semibold text-[#0f4fa8]">
            Streak {streak}
          </span>
        </div>
        <div className="grid grid-cols-4 border border-site bg-site text-center text-sm">
          <HeaderStat label="Green" value={breakdown.green} />
          <HeaderStat label="Red" value={breakdown.red} tone="red" />
          <HeaderStat label="Score" value={breakdown.score} tone={breakdown.score < 0 ? "red" : undefined} />
          <HeaderStat label="Ratio" value={formatRoundedNumber(getGreenRedRatio(breakdown.green, breakdown.red))} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ScoreBox title="Quests" green={breakdown.quests.green} red={breakdown.quests.red} />
        <SelfCareSummary snapshot={snapshot} selectedDate={selectedDate} />
        <ScoreBox title="Journal" green={breakdown.journal.green} red={breakdown.journal.red} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="fp-panel p-4">
          <p className="text-sm font-semibold">Quests</p>
          <div className="mt-3 grid gap-2">
            {activeQuests.length ? activeQuests.map((quest) => {
              const status = getQuestStatus(snapshot, selectedDate, quest.id);
              return (
                <div key={quest.id} className="grid grid-cols-[1fr_auto] border border-site bg-site p-3 text-sm">
                  <span>{quest.title}</span>
                  <span className={cn("font-semibold", status === "completed" && "text-emerald-700", status === "failed" && "text-red-700")}>
                    {status === "completed" ? "+1" : status === "failed" ? "-1" : "open"}
                  </span>
                </div>
              );
            }) : <EmptyState text="No quest for this day." />}
          </div>
        </div>

        <div className="fp-panel p-4">
          <p className="text-sm font-semibold">Journal</p>
          <div className="mt-3 grid gap-2">
            {(entry?.wants ?? []).map((task) => (
              <div key={task.id} className="grid grid-cols-[1fr_auto] border border-site bg-site p-3 text-sm">
                <span>{task.text}</span>
                <span className={cn("font-semibold", task.completed === true && "text-emerald-700", (task.completed === false || (task.completed === null && selectedDate < getTodayIsoDate())) && "text-red-700")}>
                  {task.completed === true ? "+1" : task.completed === false || (task.completed === null && selectedDate < getTodayIsoDate()) ? "-1" : "open"}
                </span>
              </div>
            ))}
            {(entry?.activities ?? []).map((activity) => (
              <div key={activity.id} className="grid grid-cols-[1fr_auto] border border-site bg-site p-3 text-sm">
                <span>{activity.text}</span>
                <span className={cn("font-semibold", activity.status === "positive" ? "text-emerald-700" : "text-red-700")}>
                  {activity.status === "positive" ? "+1" : "-1"}
                </span>
              </div>
            ))}
            {!entry?.wants.length && !entry?.activities.length ? <EmptyState text="No journal data for this day." /> : null}
          </div>
        </div>
        <DayTradeHistory trades={trades} />
      </div>
    </div>
  );
}

function DayTradeHistory({ trades }: { trades: FpairSnapshot["trades"] }) {
  return (
    <div className="fp-panel p-4">
      <p className="text-sm font-semibold">History</p>
      <div className="mt-3 grid gap-2">
        {trades.length ? trades.slice(0, 14).map((trade) => (
          <div key={trade.id} className="grid grid-cols-[1fr_auto] border border-site bg-site p-3 text-sm">
            <span>{trade.symbol} / {trade.direction}</span>
            <span className={cn("font-semibold", trade.pnl < 0 ? "text-red-700" : "text-emerald-700")}>{formatMoney(trade.pnl)}</span>
          </div>
        )) : <EmptyState text="No trade for this day." />}
      </div>
    </div>
  );
}

function CalendarPlanned({ selectedDate, snapshot, today }: { selectedDate: string; snapshot: FpairSnapshot; today: string }) {
  const plannedQuests = snapshot.quests.filter((quest) => quest.active && quest.cadence === "one_off" && (quest.dueDate ?? "") >= selectedDate);
  const plannedJournal = Object.entries(snapshot.journal)
    .filter(([date]) => date >= selectedDate)
    .flatMap(([date, entry]) => entry.wants.filter((task) => task.completed === null).map((task) => ({ date, task })));

  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">Planned</p>
      <h2 className="mt-2 text-2xl font-semibold">Upcoming from {selectedDate}</h2>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <PlannedList
          title="Quests"
          items={plannedQuests.map((quest) => ({
            date: quest.dueDate ?? today,
            detail: `${quest.category} / ${quest.condition}`,
            title: quest.title,
          }))}
        />
        <PlannedList
          title="Journal"
          items={plannedJournal.map(({ date, task }) => ({
            date,
            detail: "Planned task",
            title: task.text,
          }))}
        />
      </div>
    </div>
  );
}

function QuestResultRow({
  onSave,
  quest,
  status,
  value,
}: {
  onSave: (status: "open" | "completed" | "failed", value: number | null) => void;
  quest: Quest;
  status: "open" | "completed" | "failed";
  value: number | null;
}) {
  const [draftValue, setDraftValue] = useState(value == null ? "" : String(value));
  const hasNumericInput = quest.condition === "reach_target" || quest.condition === "stay_under";
  const savedValue = hasNumericInput && draftValue ? Number(draftValue) : null;

  return (
    <div className="mt-3 grid gap-2 border border-site bg-site p-2.5 lg:grid-cols-[minmax(0,1fr)_110px_auto] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{quest.title}</p>
        <p className="text-xs capitalize text-site-muted">
          {quest.category}
          {status === "completed" ? " / +1 green" : status === "failed" ? " / -1 red" : ""}
        </p>
      </div>
      <input
        aria-label={`Value for ${quest.title}`}
        className={cn("form-input h-10 py-0", !hasNumericInput && "cursor-not-allowed opacity-50")}
        disabled={!hasNumericInput}
        value={draftValue}
        onBlur={(event) => hasNumericInput && onSave(status, event.target.value ? Number(event.target.value) : null)}
        onChange={(event) => setDraftValue(event.target.value)}
        placeholder={quest.target == null ? "-" : String(quest.target)}
        type="number"
      />
      <div className="grid grid-cols-3 gap-1.5">
        <StatusIcon active={status === "completed"} ariaLabel={`Mark "${quest.title}" as completed`} tone="green" onClick={() => onSave("completed", savedValue)}>
          <Check className="h-4 w-4" aria-hidden="true" />
        </StatusIcon>
        <StatusIcon active={status === "failed"} ariaLabel={`Mark "${quest.title}" as failed`} tone="red" onClick={() => onSave("failed", savedValue)}>
          <X className="h-4 w-4" aria-hidden="true" />
        </StatusIcon>
        <StatusIcon active={status === "open"} ariaLabel={`Mark "${quest.title}" as open`} tone="neutral" onClick={() => onSave("open", savedValue)}>
          -
        </StatusIcon>
      </div>
    </div>
  );
}

function InstrumentGroup({
  group,
  onChange,
  value,
}: {
  group: (typeof instrumentGroups)[number];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-site-muted">{group.label}</p>
      <div className="flex flex-wrap gap-2">
        {group.instruments.map((instrument) => (
          <button
            key={instrument}
            type="button"
            className={cn(
              "border px-3 py-2 text-sm font-semibold transition",
              instrument === value ? "text-site" : "border-site bg-card text-site-muted hover:text-site",
            )}
            style={instrument === value ? { backgroundColor: group.soft, borderColor: group.color } : undefined}
            onClick={() => onChange(instrument)}
          >
            {instrument}
          </button>
        ))}
      </div>
    </div>
  );
}

function TradeForm({
  accounts,
  onSaveTrade,
  today,
  trades,
}: {
  accounts: Account[];
  onSaveTrade: (trade: ReturnType<typeof createTrade>) => void;
  today: string;
  trades: FpairSnapshot["trades"];
}) {
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("MNQ");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [pnl, setPnl] = useState("");
  const [contracts, setContracts] = useState("");
  const tradableAccounts = useMemo(() => accounts.filter((account) => ["evaluation", "funded", "live"].includes(account.phase)), [accounts]);
  const selectedAccountId = accountId || tradableAccounts[0]?.id || "";
  const tradesToday = trades.filter((trade) => trade.date === today);
  const selectedAccountTradedToday = tradesToday.some((trade) => trade.accountId === selectedAccountId);
  const dailyLimitReached = tradesToday.length >= 2;
  const blocked = !selectedAccountId || selectedAccountTradedToday || dailyLimitReached;

  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">Trades</p>
      <h2 className="mt-2 text-2xl font-semibold">Add a trade</h2>
      <div className="mt-5 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Metric label="Trades today" value={`${tradesToday.length}/2`} tone={dailyLimitReached ? "red" : undefined} />
          <Metric label="P&L today" value={formatMoney(tradesToday.reduce((sum, trade) => sum + trade.pnl, 0))} tone={tradesToday.reduce((sum, trade) => sum + trade.pnl, 0) < 0 ? "red" : "green"} />
        </div>
        <Select ariaLabel="Trading account" value={selectedAccountId} onChange={setAccountId} options={tradableAccounts.map((account) => account.id)} labels={Object.fromEntries(tradableAccounts.map((account) => [account.id, account.name]))} />
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-site-muted">Instrument</p>
          {instrumentGroups.map((group) => (
            <InstrumentGroup key={group.label} group={group} value={symbol} onChange={setSymbol} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select ariaLabel="Trade direction" value={direction} onChange={(value) => setDirection(value as TradeDirection)} options={["long", "short"]} />
          <input aria-label="Contracts" className="form-input" value={contracts} onChange={(event) => setContracts(event.target.value)} placeholder="Contracts" type="number" />
        </div>
        <input aria-label="PNL" className="form-input" value={pnl} onChange={(event) => setPnl(event.target.value)} placeholder="PNL" type="number" />
        {selectedAccountTradedToday ? <p className="text-sm font-semibold text-red-700">This account already has one trade today.</p> : null}
        {dailyLimitReached ? <p className="text-sm font-semibold text-red-700">Daily limit reached: 2 trades max.</p> : null}
        <button
          type="button"
          className="btn-primary justify-center"
          disabled={blocked}
          onClick={() => {
            if (blocked || !symbol.trim()) return;
            onSaveTrade(createTrade({
              accountId: selectedAccountId,
              date: today,
              direction,
              pnl: Number(pnl || 0),
              purchases: Number(contracts || 0),
              symbol,
            }));
            setSymbol("");
            setPnl("");
            setContracts("");
          }}
        >
          <CircleDollarSign className="h-4 w-4" />
          Save trade
        </button>
      </div>
    </div>
  );
}

type AccountFilter = "active" | "evaluation" | "funded" | "live" | "blown" | "all";

const accountFilters: Array<[AccountFilter, string]> = [
  ["active", "Active"],
  ["evaluation", "Eval"],
  ["funded", "Funded"],
  ["live", "Live"],
  ["blown", "Blown"],
  ["all", "All"],
];

function AccountForm({ onSaveAccount, plans }: { onSaveAccount: (account: Account) => void; plans: PropFirmPlan[] }) {
  const sortedPlans = useMemo(() => [...plans].sort((left, right) => `${left.propFirm}${left.accountSizeUsd}`.localeCompare(`${right.propFirm}${right.accountSizeUsd}`)), [plans]);
  const firms = useMemo(() => Array.from(new Set(sortedPlans.map((plan) => plan.propFirm))).filter(Boolean), [sortedPlans]);
  const [firm, setFirm] = useState(firms[0] ?? "");
  const effectiveFirm = firm || firms[0] || "";
  const firmPlans = sortedPlans.filter((plan) => plan.propFirm === effectiveFirm);
  const sizes = Array.from(new Set(firmPlans.map((plan) => String(plan.accountSizeUsd)))).filter(Boolean);
  const [accountSize, setAccountSize] = useState(sizes[0] ?? "");
  const effectiveSize = accountSize || sizes[0] || "";
  const sizePlans = firmPlans.filter((plan) => String(plan.accountSizeUsd) === effectiveSize);
  const [planId, setPlanId] = useState(sizePlans[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const selectedPlan = sizePlans.find((plan) => plan.id === planId) ?? sizePlans[0];

  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">Accounts</p>
      <h2 className="mt-2 text-2xl font-semibold">Add an account</h2>
      <div className="mt-5 grid gap-3">
        {sortedPlans.length ? (
          <>
            <Select ariaLabel="Prop firm" value={effectiveFirm} onChange={(value) => {
              setFirm(value);
              const firstPlan = sortedPlans.find((plan) => plan.propFirm === value);
              setAccountSize(firstPlan ? String(firstPlan.accountSizeUsd) : "");
              setPlanId(firstPlan?.id ?? "");
            }} options={firms} />
            <Select
              ariaLabel="Account size"
              value={effectiveSize}
              onChange={(value) => {
                setAccountSize(value);
                setPlanId(firmPlans.find((plan) => String(plan.accountSizeUsd) === value)?.id ?? "");
              }}
              options={sizes}
              labels={Object.fromEntries(sizes.map((size) => [size, formatMoneyCompact(Number(size))]))}
            />
            <Select
              ariaLabel="Plan type"
              value={selectedPlan?.id ?? ""}
              onChange={setPlanId}
              options={sizePlans.map((plan) => plan.id)}
              labels={Object.fromEntries(sizePlans.map((plan) => [plan.id, getPlanTypeLabel(plan)]))}
            />
            <input aria-label="Quantity" className="form-input" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" type="number" />
            {selectedPlan ? (
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Price" value={formatMoney(selectedPlan.priceUsd)} />
                <Metric label="Drawdown" value={formatMoney(selectedPlan.trailingDrawdownUsd)} />
                <Metric label="Target" value={formatMoney(selectedPlan.profitTargetUsd)} />
                <Metric label="Daily risk" value={formatMoney(selectedPlan.dailyLossLimitUsd)} />
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState text="No Supabase prop firm plan found." />
        )}
        <button
          type="button"
          className="btn-primary justify-center"
          disabled={!selectedPlan}
          onClick={() => {
            if (!selectedPlan) return;
            const count = Math.max(1, Math.min(20, Number(quantity) || 1));
            for (let index = 0; index < count; index += 1) {
              const planLabel = getPlanTypeLabel(selectedPlan);
              onSaveAccount(createAccount({
                balance: selectedPlan.accountSizeUsd,
                firm: selectedPlan.propFirm,
                maxDailyRisk: selectedPlan.dailyLossLimitUsd,
                maxDrawdown: selectedPlan.trailingDrawdownUsd,
                name: `${selectedPlan.propFirm} ${formatMoneyCompact(selectedPlan.accountSizeUsd)} ${planLabel}${count > 1 ? ` #${index + 1}` : ""}`,
                planId: selectedPlan.id,
                planType: selectedPlan.planType || selectedPlan.name,
                price: selectedPlan.priceUsd,
                profitTarget: selectedPlan.profitTargetUsd,
              }));
            }
            setQuantity("1");
          }}
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </div>
    </div>
  );
}

function AddPropFirmForm({ onSave }: { onSave: (plan: Parameters<typeof savePropFirmPlan>[0]) => void }) {
  void onSave;

  return (
    <div className="surface-flat p-1 opacity-50 grayscale sm:p-2">
      <p className="eyebrow">Prop firms</p>
      <h2 className="mt-2 text-2xl font-semibold">Add prop firm plan</h2>
      <div className="mt-5 grid gap-3">
        <input aria-label="Prop firm" className="form-input" disabled placeholder="Prop firm" />
        <input aria-label="Plan name" className="form-input" disabled placeholder="Plan name" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input aria-label="Plan type" className="form-input" disabled placeholder="Plan type" />
          <input aria-label="Account size" className="form-input" disabled placeholder="Account size" type="number" />
          <input aria-label="Price" className="form-input" disabled placeholder="Price" type="number" />
          <input aria-label="Profit target" className="form-input" disabled placeholder="Profit target" type="number" />
          <input aria-label="Daily loss limit" className="form-input" disabled placeholder="Daily loss limit" type="number" />
          <input aria-label="Drawdown" className="form-input" disabled placeholder="Drawdown" type="number" />
        </div>
        <button
          type="button"
          className="btn-primary justify-center"
          disabled
        >
          <Plus className="h-4 w-4" />
          Coming soon
        </button>
      </div>
    </div>
  );
}

function AccountsPanel({
  accounts,
  onSaveAccount,
  stats,
}: {
  accounts: Account[];
  onSaveAccount: (account: Account) => void;
  stats: ReturnType<typeof getTradingStats>;
}) {
  const [filter, setFilter] = useState<AccountFilter>("active");
  const visibleAccounts = useMemo(() => accounts.filter((account) => matchesAccountFilter(account, filter)), [accounts, filter]);

  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">Accounts</p>
      <h2 className="mt-2 text-2xl font-semibold">Account status</h2>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total" value={stats.totalAccounts} />
        <Metric label="Active" value={stats.activeAccounts} />
        <Metric label="Funded" value={stats.fundedAccounts} />
        <Metric label="Eval blown" value={stats.blownEvaluation} tone="red" />
        <Metric label="Funded blown" value={stats.blownFunded} tone="red" />
        <Metric label="Payouts" value={formatMoney(stats.payoutTotal)} />
      </div>
      <div className="mt-5">
        <Segmented items={accountFilters} value={filter} onChange={setFilter} />
      </div>
      <div className="mt-6 grid gap-3">
        {visibleAccounts.length ? visibleAccounts.map((account) => (
          <div key={account.id} className="border-b border-site py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="mt-1 text-sm text-site-muted">
                  {account.firm} / {formatMoneyCompact(account.startingBalance)} / Balance {formatMoney(account.balance)}
                </p>
              </div>
              <Select
                ariaLabel={`Phase for ${account.name}`}
                value={account.phase}
                onChange={(phase) => onSaveAccount({ ...account, phase: phase as AccountPhase })}
                options={["evaluation", "funded", "live", "blown_eval", "blown_funded"]}
              />
            </div>
          </div>
        )) : <EmptyState text="No account for this filter." />}
      </div>
    </div>
  );
}

function TradeHistory({ title = "Trade history", trades }: { title?: string; trades: FpairSnapshot["trades"] }) {
  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">History</p>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-2">
        {trades.length ? trades.slice(0, 14).map((trade) => (
          <div key={trade.id} className="grid grid-cols-[1fr_auto] border border-site bg-site p-3 text-sm">
            <span>{trade.date} / {trade.symbol} / {trade.direction}</span>
            <span className={cn("font-semibold", trade.pnl < 0 ? "text-red-700" : "text-emerald-700")}>{formatMoney(trade.pnl)}</span>
          </div>
        )) : <EmptyState text="No trade for this view." />}
      </div>
    </div>
  );
}

function SessionRiskPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <SessionsPanel />
      <RiskPanel />
    </section>
  );
}

function SessionsPanel() {
  const [continent, setContinent] = useState("Europe");
  const [countryTimezone, setCountryTimezone] = useState("Europe/Paris");
  const [simMonth, setSimMonth] = useState(String(new Date().getMonth()));
  const [simYear, setSimYear] = useState(String(new Date().getFullYear()));
  const countries = useMemo(
    () => countryOptions.filter((country) => country.region === continent).sort((left, right) => left.label.localeCompare(right.label)),
    [continent],
  );
  const selectedCountry = countryOptions.find((country) => country.timezone === countryTimezone) ?? countryOptions[0];
  const now = new Date();
  const simulationDate = getSimulationDate(Number(simYear), Number(simMonth));
  const nyMinutes = getZonedMinutes(now, "America/New_York");
  const activeSessions = tradingSessions.filter((session) => isSessionOpen(nyMinutes, session.open, session.close));

  return (
    <div className="grid gap-4">
      <div className="surface-flat p-1 sm:p-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Sessions</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatFullDate(now)}</h2>
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b48a4a]">{getSeason(now)}</span>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-3">
          <TimeBlock label="Current time" value={formatTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone)} />
          <TimeBlock label="NY market" value={formatTime(now, "America/New_York")} />
          <TimeBlock label={selectedCountry.label} value={formatTime(now, selectedCountry.timezone)} />
        </div>
        <p className={cn("mt-5 text-2xl font-semibold", activeSessions.length ? "text-emerald-700" : "text-site-muted")}>
          {activeSessions.length ? activeSessions.map((session) => session.name).join(" + ") : "No major session open"}
        </p>
      </div>

      <div className="surface-flat p-1 sm:p-2">
        <p className="eyebrow">Simulator date</p>
        <div className="mt-4 grid gap-4">
          <ChipField label="Month" items={monthOptions.map((month, index) => ({ label: month, value: String(index) }))} value={simMonth} onChange={setSimMonth} />
          <ChipField
            label="Year"
            items={Array.from({ length: 8 }, (_, index) => {
              const year = String(new Date().getFullYear() + index);
              return { label: year, value: year };
            })}
            value={simYear}
            onChange={setSimYear}
          />
          <ChipField
            label="Continent"
            items={continents.map((item) => ({ label: item, value: item }))}
            value={continent}
            onChange={(value) => {
              setContinent(value);
              const firstCountry = countryOptions
                .filter((country) => country.region === value)
                .sort((left, right) => left.label.localeCompare(right.label))[0];
              setCountryTimezone(firstCountry?.timezone ?? "Europe/Paris");
            }}
          />
          <ChipField label="Country" items={countries.map((country) => ({ label: country.label, value: country.timezone }))} value={countryTimezone} onChange={setCountryTimezone} />
        </div>
      </div>

      <div className="surface-flat p-1 sm:p-2">
        <p className="eyebrow">Sessions</p>
        <div className="mt-5 grid gap-2">
          {tradingSessions.map((session) => (
            <div key={session.id} className="grid gap-3 border bg-site p-3 text-sm md:grid-cols-[1fr_auto]" style={{ borderLeft: `4px solid ${session.color}` }}>
              <span>
                <span className="font-semibold" style={{ color: session.color }}>{session.name}</span>
                <span className="text-site-muted"> / {session.focus}</span>
              </span>
              <span className="font-semibold text-emerald-700">
                {formatNyMinutes(session.open, selectedCountry.timezone, simulationDate)} - {formatNyMinutes(session.close, selectedCountry.timezone, simulationDate, session.close <= session.open ? 1 : 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function RiskPanel() {
  const [accountSize, setAccountSize] = useState("25000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [instrument, setInstrument] = useState("MNQ");
  const [stopPoints, setStopPoints] = useState("5");
  const drawdownBase = drawdowns[accountSize] ?? 0;
  const pointValue = instrumentPointValues[instrument] ?? 1;
  const riskAmount = drawdownBase * ((Number(riskPercent) || 0) / 100);
  const contracts = Number(stopPoints) > 0 ? riskAmount / (Number(stopPoints) * pointValue) : 0;

  return (
    <div className="surface-flat p-1 sm:p-2">
      <p className="eyebrow">Risk</p>
      <h2 className="mt-2 text-2xl font-semibold">Size calculator</h2>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Risk/trade" value={formatMoney(riskAmount)} tone="red" />
        <Metric label="Drawdown base" value={formatMoney(drawdownBase)} />
        <Metric label="$ / point" value={`$${pointValue}`} />
        <Metric label="Contracts" value={contracts.toFixed(2)} tone="green" />
      </div>

      <div className="mt-6 grid gap-6">
        <p className="eyebrow">Size calculator</p>
        <div className="grid gap-4">
          <ChipField label="Account size" items={accountSizes.map((size) => ({ label: `${Number(size) / 1000}K`, value: size }))} value={accountSize} onChange={setAccountSize} />
          <ChipField label="Risk of drawdown" items={riskPercents.map((risk) => ({ label: `${risk}%`, value: risk }))} value={riskPercent} onChange={setRiskPercent} />
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-site-muted">Stop points</span>
            <input aria-label="Stop points" className="form-input" value={stopPoints} onChange={(event) => setStopPoints(event.target.value)} placeholder="Stop points" type="number" />
          </label>
        </div>

        <p className="eyebrow">Instrument</p>
        <div className="grid gap-3">
          {instrumentGroups.map((group) => (
            <InstrumentGroup key={group.label} group={group} value={instrument} onChange={setInstrument} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfCareSummary({ selectedDate, snapshot }: { selectedDate: string; snapshot: FpairSnapshot }) {
  const health = snapshot.health[selectedDate] ?? buildTodayHealth(selectedDate);
  const breakdown = getDayBreakdown(snapshot, selectedDate);

  return (
    <div className="fp-panel p-4">
      <p className="text-sm font-semibold">Self care</p>
      <div className="mt-3 grid gap-2 text-sm">
        <SelfCareLine label="Sleep" status={breakdown.selfCare.sleep} value={health.sleepHours == null ? "?" : `${health.sleepHours}h`} />
        <SelfCareLine label="Screen" status={breakdown.selfCare.screen} value={`${Math.round(health.screenTimeHours * 60)}min`} />
        <SelfCareLine label="Run" status={breakdown.selfCare.run} value={health.runKm == null ? "?" : `${health.runKm}km`} />
        <SelfCareLine label="Calories" status={breakdown.selfCare.calories} value={health.calories == null ? "?" : `${health.calories}kcal`} />
      </div>
    </div>
  );
}

function SelfCareOverviewPanel({ snapshot, today }: { snapshot: FpairSnapshot; today: string }) {
  const health = snapshot.health[today] ?? buildTodayHealth(today);
  const breakdown = getDayBreakdown(snapshot, today);

  return (
    <div className="surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Self-care</p>
        </div>
        <span className="fp-icon">
          <HeartPulse className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-2 text-sm">
        <SelfCareLine label="Sleep" status={breakdown.selfCare.sleep} value={health.sleepHours == null ? "?" : `${health.sleepHours}h`} />
        <SelfCareLine label="Screen" status={breakdown.selfCare.screen} value={`${Math.round(health.screenTimeHours * 60)}min`} />
        <SelfCareLine label="Run" status={breakdown.selfCare.run} value={health.runKm == null ? "?" : `${health.runKm}km`} />
        <SelfCareLine label="Calories" status={breakdown.selfCare.calories} value={health.calories == null ? "?" : `${health.calories}kcal`} />
      </div>
    </div>
  );
}

function SelfCareLine({ label, status, value }: { label: string; status: "green" | "red" | null; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 border border-site bg-site p-2">
      <span className="text-site-muted">{label}</span>
      <span className="font-semibold">{value}</span>
      <span className={cn("font-semibold", status === "green" && "text-emerald-700", status === "red" && "text-red-700")}>
        {status === "green" ? "+1" : status === "red" ? "-1" : ""}
      </span>
    </div>
  );
}

function PlannedList({ items, title }: { items: Array<{ date: string; detail: string; title: string }>; title: string }) {
  return (
    <div className="fp-panel p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item, index) => (
          <div key={`${item.date}-${item.title}-${index}`} className="border border-site bg-site p-3 text-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-site-muted">{item.date} / {item.detail}</p>
          </div>
        )) : <EmptyState text={`No ${title.toLowerCase()} planned.`} />}
      </div>
    </div>
  );
}

function SmallStat({ label, tone, value }: { label: string; tone?: "green" | "red"; value: number | string }) {
  return (
    <div className="fp-panel p-4">
      <p className={cn("text-2xl font-semibold", tone === "green" && "text-emerald-700", tone === "red" && "text-red-700")}>{value}</p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-site-muted">{label}</p>
    </div>
  );
}

function Metric({ label, tone, value }: { label: string; tone?: "green" | "red"; value: number | string }) {
  return <SmallStat label={label} tone={tone} value={value} />;
}

function HeaderStat({ label, tone, value }: { label: string; tone?: "red"; value: number | string }) {
  return (
    <div className="border-r border-site px-4 py-3 last:border-r-0">
      <p className={cn("text-2xl font-semibold", tone === "red" && "text-red-700")}>{value}</p>
      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-site-muted">{label}</p>
    </div>
  );
}

function ScoreBox({ green, red, title }: { green: number; red: number; title: string }) {
  return (
    <div className="fp-panel p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallStat label="Green" value={green} tone="green" />
        <SmallStat label="Red" value={red} tone="red" />
      </div>
    </div>
  );
}

function ChipField({
  items,
  label,
  onChange,
  value,
}: {
  items: Array<{ label: string; value: string }>;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-site-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              "border px-3 py-2 text-sm font-semibold transition",
              item.value === value ? "border-ink bg-ink text-white" : "border-site bg-card text-site-muted hover:text-site",
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-site bg-site p-3">
      <p className="text-xs text-site-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusIcon({
  active,
  ariaLabel,
  children,
  onClick,
  tone,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
  tone: "green" | "neutral" | "red";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center border px-2 text-sm font-semibold transition",
        active && tone === "green" && "border-emerald-600 bg-emerald-50 text-emerald-800",
        active && tone === "red" && "border-red-600 bg-red-50 text-red-800",
        active && tone === "neutral" && "border-ink bg-ink text-white",
        !active && "border-site bg-card text-site-muted hover:text-site",
      )}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  items,
  onChange,
  value,
}: {
  items: Array<[T, string]>;
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <div className="inline-flex border border-site bg-site p-1">
      {items.map(([itemValue, label]) => (
        <button
          key={itemValue}
          type="button"
          className={cn("px-3 py-2 text-sm font-semibold transition", value === itemValue ? "bg-ink text-white" : "text-site-muted hover:text-site")}
          onClick={() => {
            if (value !== itemValue) onChange(itemValue);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Select({
  ariaLabel,
  labels,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  labels?: Record<string, string>;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <select aria-label={ariaLabel} className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="border border-dashed border-site bg-site p-4 text-sm text-site-muted">{text}</div>;
}

function matchesAccountFilter(account: Account, filter: AccountFilter) {
  if (filter === "all") return true;
  if (filter === "active") return !isBlownPhase(account.phase);
  if (filter === "blown") return isBlownPhase(account.phase);
  return account.phase === filter;
}

function getPlanTypeLabel(plan: PropFirmPlan) {
  const sizeLabel = formatMoneyCompact(plan.accountSizeUsd);
  const label = plan.name || plan.planType || "Plan";
  return label.replace(new RegExp(`^${escapeRegExp(sizeLabel)}\\s+`, "i"), "").trim() || label;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isBlownPhase(phase: AccountPhase) {
  return phase === "blown_eval" || phase === "blown_funded";
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", weekday: "long" }).format(date);
}

function formatLongDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(parsed);
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(parsed);
  const day = parsed.getDate();
  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}, ${parsed.getFullYear()}`;
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(parsed);
}

function formatWeekday(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parsed);
}

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", minute: "2-digit", timeZone }).format(date);
}

function getSeason(date: Date) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "SPRING";
  if (month >= 5 && month <= 7) return "SUMMER";
  if (month >= 8 && month <= 10) return "AUTUMN";
  return "WINTER";
}

function getSimulationDate(year: number, month: number) {
  const today = new Date();
  const day = Math.min(today.getDate(), new Date(year, month + 1, 0).getDate());
  return new Date(year, month, day, 12, 0, 0);
}

function shiftDate(date: string, offset: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + offset);
  return toIsoDate(parsed);
}

function getZonedMinutes(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

function getZonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    month: value("month"),
    year: value("year"),
  };
}

function isSessionOpen(minutes: number, open: number, close: number) {
  if (close <= open) return minutes >= open || minutes < close;
  return minutes >= open && minutes < close;
}

function formatNyMinutes(minutes: number, timeZone = "America/New_York", date = new Date(), dayOffset = 0) {
  return formatTime(nyMinutesToDate(date, minutes, dayOffset), timeZone);
}

function nyMinutesToDate(baseDate: Date, minutes: number, dayOffset = 0) {
  return zonedTimeToDate(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + dayOffset,
    Math.floor(minutes / 60),
    minutes % 60,
    "America/New_York",
  );
}

function zonedTimeToDate(year: number, monthIndex: number, day: number, hour: number, minute: number, timeZone: string) {
  const utcGuess = new Date(Date.UTC(year, monthIndex, day, hour, minute, 0, 0));
  const actualParts = getZonedDateParts(utcGuess, timeZone);
  const desiredUtc = Date.UTC(year, monthIndex, day, hour, minute, 0, 0);
  const actualUtc = Date.UTC(actualParts.year, actualParts.month - 1, actualParts.day, actualParts.hour, actualParts.minute, 0, 0);

  return new Date(utcGuess.getTime() + desiredUtc - actualUtc);
}
