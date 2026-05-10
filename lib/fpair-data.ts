"use client";

import { getTodayIsoDate, toIsoDate } from "@/lib/date";
import {
  dashboardEvents,
  deleteJournalEntriesUpTo,
  loadDashboardSnapshot,
  saveDashboardSettings,
  type DashboardSettings,
  type JournalEntries,
} from "@/lib/dashboard-data";
import { supabase } from "@/lib/supabase/client";

export type SignalType = "green" | "red";
export type QuestCategory =
  | "health"
  | "business"
  | "discipline"
  | "learning"
  | "spiritual"
  | "social"
  | "work"
  | "private";
export type QuestCadence = "daily" | "weekly" | "monthly" | "one_off";
export type QuestCondition = "reach_target" | "stay_under" | "to_do" | "to_not_do";
export type AccountPhase = "evaluation" | "funded" | "live" | "blown_eval" | "blown_funded";
export type TradeDirection = "long" | "short";
export type SessionStatus = "planned" | "done" | "missed";

export type Profile = {
  name: string;
  birthdate: string;
  gender: "M" | "F" | "X" | "";
  heightCm: number | null;
  weightKg: number | null;
  sleepGreenHours: number;
  screenTimeRedMinutes: number;
  runGreenKm: number;
  caloriesGreenKcal: number;
};

export type HealthDay = {
  date: string;
  runKm: number | null;
  sleepHours: number | null;
  screenTimeHours: number;
  calories: number | null;
};

export type Quest = {
  id: string;
  domain: "trader" | "system" | "journal";
  category: QuestCategory;
  title: string;
  cadence: QuestCadence;
  condition: QuestCondition;
  target: number | null;
  units: string;
  points: number;
  active: boolean;
  dueDate: string | null;
};

export type QuestResult = {
  completedQuestIds: string[];
  failedQuestIds: string[];
  questValues: Record<string, number>;
};

export type Account = {
  id: string;
  name: string;
  firm: string;
  planId?: string;
  planType: string;
  phase: AccountPhase;
  price: number;
  startingBalance: number;
  balance: number;
  maxDailyRisk: number;
  maxDrawdown: number;
  profitTarget: number;
  activationFeesPaid: number;
  resetCostsPaid: number;
  resetCount: number;
  blownEvaluationCount: number;
  blownFundedCount: number;
  fundedAt?: string;
  lastResetAt?: string;
  payouts: Payout[];
  history: AccountHistoryItem[];
};

export type Payout = {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  note: string;
};

export type AccountHistoryItem = {
  id: string;
  accountId: string;
  date: string;
  label: string;
};

export type Trade = {
  id: string;
  accountId: string;
  date: string;
  createdAt: string;
  symbol: string;
  direction: TradeDirection;
  pnl: number;
  purchases: number;
  checklist: {
    setup: boolean;
    neutral: boolean;
    accountFree: boolean;
  };
};

export type TradeSession = {
  id: string;
  accountId: string;
  date: string;
  title: string;
  market: string;
  plannedRisk: number;
  result: number;
  status: SessionStatus;
  review: string;
};

export type PropFirmPlan = {
  accountSizeUsd: number;
  dailyLossLimitUsd: number;
  id: string;
  maxPayoutUsd: number;
  name: string;
  planType: string;
  priceUsd: number;
  profitTargetUsd: number;
  propFirm: string;
  trailingDrawdownUsd: number;
};

export type ListType = "goals_1m" | "goals_3m" | "goals_6m" | "goals_12m" | "todo" | "buy" | "watch" | "read";

export type ListItem = {
  completed: boolean;
  createdAt: string;
  detail: string;
  id: string;
  listType: ListType;
  position: number;
  title: string;
};

export type FpairSnapshot = {
  accounts: Account[];
  health: Record<string, HealthDay>;
  journal: JournalEntries;
  lists: ListItem[];
  profile: Profile;
  propFirmPlans: PropFirmPlan[];
  questResults: Record<string, QuestResult>;
  quests: Quest[];
  remoteProgress: StoredLevelProgress | null;
  sessions: TradeSession[];
  settings: DashboardSettings;
  trades: Trade[];
};

export type ScoreStatus = SignalType | null;

export type DayBreakdown = {
  conversion: number;
  green: number;
  journal: { green: number; red: number };
  quests: { green: number; red: number };
  red: number;
  score: number;
  selfCare: {
    calories: ScoreStatus;
    green: number;
    red: number;
    run: ScoreStatus;
    screen: ScoreStatus;
    sleep: ScoreStatus;
  };
};

export type LevelProgress = {
  conversion: number;
  green: number;
  level: number;
  maxLevel: number;
  nextLevel: number | null;
  nextLevelRatioRequired: number;
  nextLevelScore: number;
  progress: number;
  red: number;
  score: number;
};

type StoredLevelProgress = {
  green: number;
  level: number;
  nextLevelScore: number;
  progress: number;
  red: number;
  score: number;
};

const maxLevel = 100;
const snapshotCache = new Map<string, { cachedAt: number; snapshot: FpairSnapshot }>();
const snapshotCacheTtlMs = 60_000;
let latestFpairSnapshot: FpairSnapshot | null = null;

export const defaultProfile: Profile = {
  name: "",
  birthdate: "",
  gender: "",
  heightCm: null,
  weightKg: null,
  sleepGreenHours: 6,
  screenTimeRedMinutes: 60,
  runGreenKm: 5,
  caloriesGreenKcal: 1000,
};

export const questCategories: QuestCategory[] = [
  "health",
  "business",
  "discipline",
  "learning",
  "spiritual",
  "social",
  "work",
  "private",
];

export async function loadFpairSnapshot(userId: string, options: { force?: boolean } = {}): Promise<FpairSnapshot> {
  const cached = snapshotCache.get(userId);
  if (!options.force && cached && Date.now() - cached.cachedAt < snapshotCacheTtlMs) {
    return cached.snapshot;
  }

  const [dashboard, profileRows, healthRows, questRows, questResultRows, accountRows, tradeRows, payoutRows, eventRows, feedRows, planRows, listRows] =
    await Promise.all([
      loadDashboardSnapshot(userId, true),
      supabase.from("trading_profiles").select("*").eq("user_id", userId).limit(1),
      supabase.from("fpair_health_days").select("*").eq("user_id", userId).order("entry_date", { ascending: true }),
      supabase.from("fpair_quests").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("fpair_quest_results").select("*").eq("user_id", userId).order("entry_date", { ascending: true }),
      supabase.from("trading_accounts").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("trading_trades").select("*").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("trading_payouts").select("*").eq("user_id", userId).order("received_at", { ascending: false }),
      supabase.from("trading_account_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }),
      supabase.from("trading_feed_events").select("*").eq("user_id", userId).eq("type", "session").order("occurred_at", { ascending: false }),
      supabase.from("trading_prop_firm_plans").select("*"),
      supabase.from("fpair_list_items").select("*").eq("user_id", userId).order("position", { ascending: true }),
    ]);

  if (healthRows.error) {
    throw healthRows.error;
  }

  const profileRow = profileRows.error ? null : profileRows.data?.[0];
  const health = healthRowsToMap(healthRows.data ?? []);
  const quests = questRows.error ? [] : (questRows.data ?? []).map(rowToQuest).filter(Boolean);
  const questResults = questResultRows.error ? {} : questResultsToMap(questResultRows.data ?? []);
  const trades = tradeRows.error
    ? []
    : (tradeRows.data ?? [])
        .filter((row) => row.status !== "deleted")
        .map(rowToTrade);
  const payouts = payoutRows.error ? [] : (payoutRows.data ?? []).map(rowToPayout);
  const events = eventRows.error ? [] : (eventRows.data ?? []).map(rowToEvent);
  const propFirmPlans = planRows.error ? [] : (planRows.data ?? []).map(rowToPropFirmPlan);
  const lists = listRows.error ? [] : (listRows.data ?? []).map(rowToListItem);
  const plansById = new Map((planRows.error ? [] : planRows.data ?? []).map((row) => [String(row.id), row]));
  const accounts = accountRows.error
    ? []
    : (accountRows.data ?? []).map((row) =>
        rowToAccount(row, {
          events: events.filter((event) => event.accountId === row.id),
          payouts: payouts.filter((payout) => payout.accountId === row.id),
          plan: plansById.get(String(row.plan_id)),
          trades: trades.filter((trade) => trade.accountId === row.id),
        }),
      );

  const snapshot = {
    accounts,
    health,
    journal: dashboard.entries,
    lists,
    profile: rowToProfile(profileRow),
    propFirmPlans,
    questResults,
    quests,
    remoteProgress: rowToStoredLevelProgress(profileRow),
    sessions: feedRows.error ? [] : (feedRows.data ?? []).map(rowToSession),
    settings: dashboard.settings,
    trades,
  };

  snapshotCache.set(userId, { cachedAt: Date.now(), snapshot });
  latestFpairSnapshot = snapshot;
  return snapshot;
}

export function patchFpairSnapshotCache(userId: string, snapshot: FpairSnapshot) {
  latestFpairSnapshot = snapshot;
  snapshotCache.set(userId, { cachedAt: Date.now(), snapshot });
}

export function getLatestFpairSnapshot() {
  return latestFpairSnapshot;
}

export function subscribeFpairChanges(userId: string, onChange: () => void) {
  const channel = supabase.channel(`fpair-workspace-${userId}`);
  const tables = [
    "dashboard_settings",
    "dashboard_journal_entries",
    "dashboard_journal_tasks",
    "dashboard_journal_activities",
    "fpair_health_days",
    "fpair_quests",
    "fpair_quest_results",
    "fpair_list_items",
    "trading_profiles",
    "trading_accounts",
    "trading_trades",
    "trading_account_events",
    "trading_feed_events",
    "trading_payouts",
  ];

  for (const table of tables) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      onChange,
    );
  }

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function saveProfile(userId: string, profile: Profile) {
  const { error } = await supabase.from("trading_profiles").upsert({
    birthday: profile.birthdate || "",
    calories_green_kcal: profile.caloriesGreenKcal,
    gender: profile.gender || "X",
    height_cm: profile.heightCm,
    name: profile.name,
    run_green_km: profile.runGreenKm,
    screen_time_red_minutes: profile.screenTimeRedMinutes,
    sleep_green_hours: profile.sleepGreenHours,
    updated_at: new Date().toISOString(),
    user_id: userId,
    weight_kg: profile.weightKg,
  });
  if (error) throw error;
}

export async function saveHealthDay(userId: string, day: HealthDay) {
  const { error } = await supabase.from("fpair_health_days").upsert({
    calories: day.calories,
    entry_date: day.date,
    run_km: day.runKm,
    screen_time_hours: day.screenTimeHours,
    sleep_hours: day.sleepHours,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function saveQuest(userId: string, quest: Quest) {
  const { error } = await supabase.from("fpair_quests").upsert({
    active: quest.active,
    cadence: quest.cadence,
    category: quest.category,
    condition: quest.condition,
    domain: quest.domain,
    due_date: quest.dueDate || null,
    id: quest.id,
    points: quest.points,
    target: quest.target,
    title: quest.title,
    units: quest.units,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function deleteQuest(userId: string, questId: string) {
  const { error } = await supabase.from("fpair_quests").delete().eq("user_id", userId).eq("id", questId);
  if (error) throw error;
}

export async function saveListItem(userId: string, item: ListItem) {
  const { error } = await supabase.from("fpair_list_items").upsert({
    completed: item.completed,
    created_at: item.createdAt,
    detail: item.detail,
    id: item.id,
    list_type: item.listType,
    position: item.position,
    title: item.title,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function deleteListItem(userId: string, itemId: string) {
  const { error } = await supabase.from("fpair_list_items").delete().eq("user_id", userId).eq("id", itemId);
  if (error) throw error;
}

export async function saveQuestResult(
  userId: string,
  entryDate: string,
  questId: string,
  status: "open" | "completed" | "failed",
  value: number | null,
) {
  const { error } = await supabase.from("fpair_quest_results").upsert({
    entry_date: entryDate,
    quest_id: questId,
    status,
    updated_at: new Date().toISOString(),
    user_id: userId,
    value,
  });
  if (error) throw error;
}

export async function saveAccount(userId: string, account: Account) {
  const { error } = await supabase.from("trading_accounts").upsert({
    account_type: account.planType || phaseToStatus(account.phase),
    activation_fees_usd: account.activationFeesPaid,
    activations: account.activationFeesPaid ? 1 : 0,
    blown_eval_count: account.blownEvaluationCount,
    blown_funded_count: account.blownFundedCount,
    bought_at: account.history.at(-1)?.date ?? getTodayIsoDate(),
    id: account.id,
    last_activation_at: account.fundedAt ?? null,
    last_reset_at: account.lastResetAt ?? null,
    plan_id: account.planId || account.planType || `${account.firm}-${account.startingBalance}`,
    price_usd: account.price,
    prop_firm: account.firm,
    reset_costs_usd: account.resetCostsPaid,
    resets: account.resetCount,
    size_usd: account.startingBalance,
    status: phaseToStatus(account.phase),
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function saveTrade(userId: string, trade: Trade) {
  const startedAt = trade.createdAt || `${trade.date}T00:00:00.000Z`;
  const { error } = await supabase.from("trading_trades").upsert({
    account_id: trade.accountId,
    checklist: trade.checklist,
    closed_at: startedAt,
    contracts: trade.purchases,
    direction: trade.direction,
    duration_seconds: null,
    id: trade.id,
    notes: null,
    pnl: trade.pnl,
    risk_amount: null,
    rr: null,
    setup: null,
    started_at: startedAt,
    status: "closed",
    symbol: trade.symbol,
    timeframe: null,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function saveSession(userId: string, session: TradeSession) {
  const { error } = await supabase.from("trading_feed_events").upsert({
    description: JSON.stringify(session),
    id: session.id,
    occurred_at: `${session.date}T00:00:00.000Z`,
    title: session.title,
    type: "session",
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function savePropFirmPlan(
  plan: {
    accountSizeUsd: number;
    dailyLossLimitUsd: number;
    id?: string;
    maxPayoutUsd?: number;
    name: string;
    planType: string;
    priceUsd: number;
    profitTargetUsd?: number;
    propFirm: string;
    trailingDrawdownUsd: number;
  },
) {
  const id = plan.id ?? `${slugify(plan.propFirm)}-${slugify(plan.name)}-${plan.accountSizeUsd}`;
  const { error } = await supabase.from("trading_prop_firm_plans").upsert({
    account_size_usd: plan.accountSizeUsd,
    consistency_rule: "",
    daily_loss_limit_usd: plan.dailyLossLimitUsd,
    funded_rules: "",
    id,
    max_contracts: "",
    max_payout_usd: plan.maxPayoutUsd ?? 0,
    name: plan.name,
    plan_type: plan.planType,
    price_usd: plan.priceUsd,
    profit_target_usd: plan.profitTargetUsd ?? 0,
    prop_firm: plan.propFirm,
    rules: [],
    trailing_drawdown_usd: plan.trailingDrawdownUsd,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function createSession(input: Omit<TradeSession, "id">): TradeSession {
  return {
    ...input,
    id: `session-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  };
}

export async function resetChallengeStart(userId: string, settings: DashboardSettings, startDate: string) {
  await saveDashboardSettings(userId, {
    ...settings,
    startDate,
    startDateChangedAt: getTodayIsoDate(),
  });
  window.dispatchEvent(new Event(dashboardEvents.settings));
}

export async function deleteUserActivityData(userId: string, today: string, settings: DashboardSettings) {
  const [{ error: healthError }, { error: questError }, { error: resultError }, { error: listError }] = await Promise.all([
    supabase.from("fpair_health_days").delete().eq("user_id", userId),
    supabase.from("fpair_quests").delete().eq("user_id", userId),
    supabase.from("fpair_quest_results").delete().eq("user_id", userId),
    supabase.from("fpair_list_items").delete().eq("user_id", userId),
    deleteJournalEntriesUpTo(userId, today).then(() => ({ error: null })),
  ]);

  if (healthError) throw healthError;
  if (questError) throw questError;
  if (resultError) throw resultError;
  if (listError) throw listError;

  await saveDashboardSettings(userId, {
    ...settings,
    startDate: today,
    startDateChangedAt: today,
    lastDeleteDate: today,
  });
  window.dispatchEvent(new Event(dashboardEvents.settings));
  window.dispatchEvent(new Event(dashboardEvents.journal));
}

export function buildTodayHealth(date = getTodayIsoDate()): HealthDay {
  return {
    calories: null,
    date,
    runKm: null,
    screenTimeHours: 0,
    sleepHours: null,
  };
}

export function createQuest(input: Partial<Quest> & Pick<Quest, "title">): Quest {
  return {
    active: input.active ?? true,
    cadence: input.cadence ?? "daily",
    category: input.category ?? "discipline",
    condition: input.condition ?? "to_do",
    domain: input.domain ?? (input.category === "business" || input.category === "work" ? "trader" : "system"),
    dueDate: input.dueDate ?? null,
    id: input.id ?? `quest-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    points: input.points ?? 1,
    target: input.target ?? null,
    title: input.title,
    units: input.units ?? "",
  };
}

export function createAccount(input: {
  balance: number;
  firm: string;
  maxDailyRisk?: number;
  maxDrawdown?: number;
  name?: string;
  phase?: AccountPhase;
  planId?: string;
  planType?: string;
  price?: number;
  profitTarget?: number;
}) {
  const today = getTodayIsoDate();
  const id = `account-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  return {
    activationFeesPaid: 0,
    balance: input.balance,
    blownEvaluationCount: 0,
    blownFundedCount: 0,
    firm: input.firm,
    history: [{ accountId: id, date: today, id: `event-${Date.now()}`, label: "Account created" }],
    id,
    maxDailyRisk: input.maxDailyRisk ?? 0,
    maxDrawdown: input.maxDrawdown ?? 0,
    name: input.name || `${input.firm} ${formatMoneyCompact(input.balance)}`,
    payouts: [],
    phase: input.phase ?? "evaluation",
    planId: input.planId,
    planType: input.planType ?? "",
    price: input.price ?? 0,
    profitTarget: input.profitTarget ?? 0,
    resetCostsPaid: 0,
    resetCount: 0,
    startingBalance: input.balance,
  } satisfies Account;
}

export function createTrade(input: Omit<Trade, "id" | "createdAt" | "checklist"> & { checklist?: Trade["checklist"] }) {
  return {
    ...input,
    checklist: input.checklist ?? { accountFree: true, neutral: true, setup: true },
    createdAt: `${input.date}T00:00:00.000Z`,
    id: `trade-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  } satisfies Trade;
}

export function getActiveQuests(quests: Quest[], date: string) {
  return quests.filter((quest) => quest.active && (quest.cadence !== "one_off" || quest.dueDate === date));
}

export function getQuestStatus(snapshot: FpairSnapshot, date: string, questId: string) {
  const result = snapshot.questResults[date];
  if (result?.completedQuestIds.includes(questId)) return "completed";
  if (result?.failedQuestIds.includes(questId)) return "failed";
  return "open";
}

export function getQuestValue(snapshot: FpairSnapshot, date: string, questId: string) {
  return snapshot.questResults[date]?.questValues[questId] ?? null;
}

export function getLevelProgress(snapshot: FpairSnapshot): LevelProgress {
  const calculated = getCalculatedLevelProgress(snapshot);
  const stored = snapshot.remoteProgress;
  if (!stored) return calculated;

  const calculatedSignals = calculated.green + calculated.red;
  const storedSignals = stored.green + stored.red;
  if (calculatedSignals >= storedSignals && calculated.level >= stored.level) {
    return calculated;
  }

  const storedCalculated = getLevelProgressFromCounts(stored.green, stored.red);
  const merged = storedSignals > calculatedSignals ? storedCalculated : calculated;
  if (stored.level <= merged.level) return merged;

  const level = Math.max(1, Math.min(maxLevel, stored.level));
  const nextLevel = level >= maxLevel ? null : level + 1;

  return {
    ...merged,
    level,
    nextLevel,
    nextLevelScore: nextLevel ? getLevelScoreTarget(nextLevel) : getLevelScoreTarget(maxLevel),
    progress: Math.max(0, Math.min(100, stored.progress || merged.progress)),
  };
}

function getCalculatedLevelProgress(snapshot: FpairSnapshot): LevelProgress {
  let targetLevel = 1;
  let progress = getLevelProgressForTargetLevel(snapshot, targetLevel);

  for (let index = 0; index < 5; index += 1) {
    if (progress.level === targetLevel) break;
    targetLevel = progress.level;
    progress = getLevelProgressForTargetLevel(snapshot, targetLevel);
  }

  return progress;
}

function getLevelProgressForTargetLevel(snapshot: FpairSnapshot, targetLevel: number): LevelProgress {
  const dates = new Set([
    ...Object.keys(snapshot.journal),
    ...Object.keys(snapshot.health),
    ...Object.keys(snapshot.questResults),
  ]);
  let green = 0;
  let red = 0;

  dates.forEach((date) => {
    if (snapshot.settings.startDate && date < snapshot.settings.startDate) return;
    const breakdown = getDayBreakdownForLevel(snapshot, date, targetLevel);
    green += breakdown.green;
    red += breakdown.red;
  });

  return getLevelProgressFromCounts(green, red);
}

export function getDayBreakdown(snapshot: FpairSnapshot, date: string): DayBreakdown {
  if (snapshot.settings.startDate && date < snapshot.settings.startDate) {
    return emptyBreakdown();
  }

  return getDayBreakdownForLevel(snapshot, date, getLevelProgress(snapshot).level);
}

function getDayBreakdownForLevel(snapshot: FpairSnapshot, date: string, targetLevel: number): DayBreakdown {
  const entry = snapshot.journal[date];
  const result = snapshot.questResults[date];
  const selfCare = getSelfCareScore(snapshot, date, targetLevel);
  const taskGreen = entry?.wants.filter((task) => task.completed === true).length ?? 0;
  const taskRed = entry?.wants.filter((task) => task.completed === false).length ?? 0;
  const activityGreen =
    entry?.activities.filter((activity) => activity.status === "positive" && activity.text.trim()).length ?? 0;
  const activityRed =
    entry?.activities.filter((activity) => activity.status === "negative" && activity.text.trim()).length ?? 0;
  const questGreen = result?.completedQuestIds.length ?? 0;
  const questRed = result?.failedQuestIds.length ?? 0;
  const green = taskGreen + activityGreen + questGreen + selfCare.green;
  const red = taskRed + activityRed + questRed + selfCare.red;

  return {
    conversion: green + red ? Math.round((green / (green + red)) * 100) : 0,
    green,
    journal: { green: taskGreen + activityGreen, red: taskRed + activityRed },
    quests: { green: questGreen, red: questRed },
    red,
    score: green - red,
    selfCare,
  };
}

export function getStats(snapshot: FpairSnapshot, from: string, to: string) {
  const days = enumerateDates(from, to);
  const targetLevel = getLevelProgress(snapshot).level;
  const totals = days.reduce(
    (acc, date) => {
      const breakdown = getDayBreakdownForLevel(snapshot, date, targetLevel);
      acc.green += breakdown.green;
      acc.red += breakdown.red;
      acc.ratio += breakdown.score;
      if (breakdown.green > breakdown.red) acc.cleanDays += 1;
      return acc;
    },
    { cleanDays: 0, green: 0, ratio: 0, red: 0 },
  );
  const divisor = Math.max(1, days.length);

  return {
    ...totals,
    avgGreenPerDay: totals.green / divisor,
    avgRatioPerDay: totals.ratio / divisor,
    avgRedPerDay: totals.red / divisor,
    conversion: totals.green + totals.red ? Math.round((totals.green / (totals.green + totals.red)) * 100) : 0,
  };
}

export function getTradingStats(snapshot: FpairSnapshot) {
  const activeAccounts = snapshot.accounts.filter((account) =>
    ["evaluation", "funded", "live"].includes(account.phase),
  );
  const totalPnl = snapshot.trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = snapshot.trades.filter((trade) => trade.pnl > 0).length;
  const losses = snapshot.trades.filter((trade) => trade.pnl < 0).length;
  const payoutTotal = snapshot.accounts.flatMap((account) => account.payouts).reduce((sum, payout) => sum + payout.amount, 0);

  return {
    activeAccounts: activeAccounts.length,
    blownEvaluation: snapshot.accounts.reduce((sum, account) => sum + account.blownEvaluationCount, 0),
    blownFunded: snapshot.accounts.reduce((sum, account) => sum + account.blownFundedCount, 0),
    fundedAccounts: snapshot.accounts.filter((account) => account.phase === "funded" || account.phase === "live").length,
    losses,
    payoutTotal,
    totalAccounts: snapshot.accounts.length,
    totalPnl,
    trades: snapshot.trades.length,
    winRate: snapshot.trades.length ? Math.round((wins / snapshot.trades.length) * 100) : 0,
  };
}

export function getHistory(snapshot: FpairSnapshot) {
  const journalEvents = Object.entries(snapshot.journal).flatMap(([date, entry]) => [
    ...entry.wants
      .filter((task) => task.completed !== null)
      .map((task) => ({
        date,
        description: task.text,
        tone: task.completed ? "green" : "red",
        title: task.completed ? "Journal task completed" : "Journal task missed",
        type: "journal",
      })),
    ...entry.activities.map((activity) => ({
      date,
      description: activity.text,
      tone: activity.status === "positive" ? "green" : "red",
      title: "Influential activity",
      type: "journal",
    })),
  ]);
  const questEvents = Object.entries(snapshot.questResults).flatMap(([date, result]) => [
    ...result.completedQuestIds.map((questId) => ({
      date,
      description: snapshot.quests.find((quest) => quest.id === questId)?.title ?? questId,
      tone: "green",
      title: "Quest completed",
      type: "quest",
    })),
    ...result.failedQuestIds.map((questId) => ({
      date,
      description: snapshot.quests.find((quest) => quest.id === questId)?.title ?? questId,
      tone: "red",
      title: "Quest failed",
      type: "quest",
    })),
  ]);
  const tradeEvents = snapshot.trades.map((trade) => ({
    date: trade.date,
    description: `${trade.symbol} ${trade.direction} ${formatMoney(trade.pnl)}`,
    tone: trade.pnl >= 0 ? "green" : "red",
    title: "Trade closed",
    type: "trade",
  }));

  return [...journalEvents, ...questEvents, ...tradeEvents]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 80);
}

export function getDynamicSelfCareTargets(profile: Profile, level: number) {
  const tier = Math.max(0, Math.min(10, Math.floor(level / 10)));
  const sleepBase = profile.sleepGreenHours || 6;
  const screenBase = profile.screenTimeRedMinutes || 60;
  const runBase = profile.runGreenKm || 5;
  const caloriesBase = profile.caloriesGreenKcal || 1000;

  return {
    caloriesGreenKcal: Math.round(Math.min(caloriesBase + tier * 60, caloriesBase * 1.6)),
    runGreenKm: roundTarget(Math.min(runBase + tier * 0.2, runBase * 1.4)),
    screenTimeRedMinutes: Math.round(Math.max(screenBase - tier * 2, screenBase * 0.7)),
    sleepGreenHours: sleepBase,
  };
}

export function daysBetween(startDate: string, endDate: string) {
  if (!startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatMoneyCompact(value: number) {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return formatMoney(value);
}

export function enumerateDates(from: string, to: string) {
  const dates: string[] = [];
  let cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return dates;
}

function emptyBreakdown(): DayBreakdown {
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

function getSelfCareScore(snapshot: FpairSnapshot, date: string, level: number) {
  const day = snapshot.health[date];
  const targets = getDynamicSelfCareTargets(snapshot.profile, level);
  const sleep = getBinaryStatus(day?.sleepHours, (value) => value >= targets.sleepGreenHours);
  const screen = day ? getBinaryStatus(day.screenTimeHours * 60, (value) => value < targets.screenTimeRedMinutes) : null;
  const run = getBinaryStatus(day?.runKm, (value) => value >= targets.runGreenKm);
  const calories = getBinaryStatus(day?.calories, (value) => value >= targets.caloriesGreenKcal);
  const statuses = [sleep, screen, run, calories];

  return {
    calories,
    green: statuses.filter((status) => status === "green").length,
    red: statuses.filter((status) => status === "red").length,
    run,
    screen,
    sleep,
  };
}

function getBinaryStatus(value: number | null | undefined, isGreen: (value: number) => boolean): ScoreStatus {
  if (value == null) return null;
  return isGreen(value) ? "green" : "red";
}

function getLevelProgressFromCounts(green: number, red: number): LevelProgress {
  const score = Math.max(0, green - red);
  const conversion = getGreenConversion(green, red);
  let level = 1;

  for (let candidate = maxLevel; candidate >= 1; candidate -= 1) {
    if (score >= getLevelScoreTarget(candidate) && conversion >= getRequiredGreenConversion(candidate)) {
      level = candidate;
      break;
    }
  }

  const nextLevel = level >= maxLevel ? null : level + 1;
  const scoreForCurrentLevel = getLevelScoreTarget(level);
  const scoreForNextLevel = nextLevel ? getLevelScoreTarget(nextLevel) : scoreForCurrentLevel;
  const nextLevelRatioRequired = nextLevel ? getRequiredGreenConversion(nextLevel) : getRequiredGreenConversion(maxLevel);
  const xpProgress = nextLevel
    ? (score - scoreForCurrentLevel) / Math.max(1, scoreForNextLevel - scoreForCurrentLevel)
    : 1;
  const ratioProgress = nextLevelRatioRequired > 0 ? conversion / nextLevelRatioRequired : 1;

  return {
    conversion,
    green,
    level,
    maxLevel,
    nextLevel,
    nextLevelRatioRequired,
    nextLevelScore: scoreForNextLevel,
    progress: nextLevel ? Math.round(Math.max(0, Math.min(1, Math.min(xpProgress, ratioProgress))) * 100) : 100,
    red,
    score,
  };
}

function getLevelScoreTarget(level: number) {
  if (level <= 1) return 0;
  const rank = level - 1;
  return Math.round(7 * rank + 0.5 * Math.pow(rank, 2) + 0.00035 * Math.pow(rank, 3));
}

function getRequiredGreenConversion(level: number) {
  if (level <= 5) return 0;
  const rank = (level - 5) / (maxLevel - 5);
  return Math.min(0.95, 0.52 + rank * 0.43);
}

function getGreenConversion(green: number, red: number) {
  const total = green + red;
  return total ? green / total : 1;
}

function rowToProfile(row: Record<string, unknown> | null | undefined): Profile {
  return {
    birthdate: stringValue(row?.birthday),
    caloriesGreenKcal: numberValue(row?.calories_green_kcal, defaultProfile.caloriesGreenKcal),
    gender: normalizeGender(row?.gender),
    heightCm: nullableNumber(row?.height_cm),
    name: stringValue(row?.name),
    runGreenKm: numberValue(row?.run_green_km, defaultProfile.runGreenKm),
    screenTimeRedMinutes: numberValue(row?.screen_time_red_minutes, defaultProfile.screenTimeRedMinutes),
    sleepGreenHours: numberValue(row?.sleep_green_hours, defaultProfile.sleepGreenHours),
    weightKg: nullableNumber(row?.weight_kg),
  };
}

function rowToPropFirmPlan(row: Record<string, unknown>): PropFirmPlan {
  return {
    accountSizeUsd: numberValue(row.account_size_usd, 0),
    dailyLossLimitUsd: numberValue(row.daily_loss_limit_usd, 0),
    id: stringValue(row.id),
    maxPayoutUsd: numberValue(row.max_payout_usd, 0),
    name: stringValue(row.name),
    planType: stringValue(row.plan_type),
    priceUsd: numberValue(row.price_usd, 0),
    profitTargetUsd: numberValue(row.profit_target_usd, 0),
    propFirm: stringValue(row.prop_firm),
    trailingDrawdownUsd: numberValue(row.trailing_drawdown_usd, 0),
  };
}

function rowToListItem(row: Record<string, unknown>): ListItem {
  return {
    completed: row.completed === true,
    createdAt: stringValue(row.created_at) || new Date().toISOString(),
    detail: stringValue(row.detail),
    id: stringValue(row.id),
    listType: normalizeListType(row.list_type),
    position: numberValue(row.position, 0),
    title: stringValue(row.title),
  };
}

function rowToStoredLevelProgress(row: Record<string, unknown> | null | undefined): StoredLevelProgress | null {
  if (!row) return null;
  const green = numberValue(row.green_count, 0);
  const red = numberValue(row.red_count, 0);
  const level = numberValue(row.level, 1);
  const score = numberValue(row.level_score, Math.max(0, green - red));
  const progress = numberValue(row.level_progress, 0);
  const nextLevelScore = numberValue(row.next_level_score, 0);

  if (green === 0 && red === 0 && level <= 1 && score === 0) return null;

  return {
    green,
    level,
    nextLevelScore,
    progress,
    red,
    score,
  };
}

function rowToQuest(row: Record<string, unknown>): Quest {
  return {
    active: row.active !== false,
    cadence: normalizeCadence(row.cadence),
    category: normalizeCategory(row.category),
    condition: normalizeCondition(row.condition),
    domain: row.domain === "journal" || row.domain === "trader" || row.domain === "system" ? row.domain : "system",
    dueDate: stringValue(row.due_date) || null,
    id: stringValue(row.id),
    points: numberValue(row.points, 1),
    target: nullableNumber(row.target),
    title: stringValue(row.title),
    units: stringValue(row.units),
  };
}

function questResultsToMap(rows: Record<string, unknown>[]) {
  const results: Record<string, QuestResult> = {};
  for (const row of rows) {
    const date = stringValue(row.entry_date);
    const questId = stringValue(row.quest_id);
    if (!date || !questId) continue;
    results[date] ??= { completedQuestIds: [], failedQuestIds: [], questValues: {} };
    if (row.status === "completed") results[date].completedQuestIds.push(questId);
    if (row.status === "failed") results[date].failedQuestIds.push(questId);
    const value = nullableNumber(row.value);
    if (value != null) results[date].questValues[questId] = value;
  }
  return results;
}

function healthRowsToMap(rows: Record<string, unknown>[]) {
  return Object.fromEntries(
    rows.map((row) => {
      const date = stringValue(row.entry_date);
      return [
        date,
        {
          calories: nullableNumber(row.calories),
          date,
          runKm: nullableNumber(row.run_km),
          screenTimeHours: numberValue(row.screen_time_hours, 0),
          sleepHours: nullableNumber(row.sleep_hours),
        },
      ];
    }),
  );
}

function rowToTrade(row: Record<string, unknown>): Trade {
  const startedAt = stringValue(row.started_at) || new Date().toISOString();
  return {
    accountId: stringValue(row.account_id),
    checklist: normalizeChecklist(row.checklist),
    createdAt: startedAt,
    date: startedAt.slice(0, 10),
    direction: row.direction === "short" ? "short" : "long",
    id: stringValue(row.id),
    pnl: numberValue(row.pnl, 0),
    purchases: numberValue(row.contracts, 0),
    symbol: stringValue(row.symbol),
  };
}

function rowToPayout(row: Record<string, unknown>): Payout {
  return {
    accountId: stringValue(row.account_id),
    amount: numberValue(row.amount_usd, 0),
    date: stringValue(row.received_at),
    id: stringValue(row.id),
    note: stringValue(row.source) || "Payout",
  };
}

function rowToEvent(row: Record<string, unknown>): AccountHistoryItem {
  return {
    accountId: stringValue(row.account_id),
    date: stringValue(row.occurred_at).slice(0, 10),
    id: stringValue(row.id),
    label: stringValue(row.description) || stringValue(row.title),
  };
}

function rowToAccount(
  row: Record<string, unknown>,
  relations: {
    events: AccountHistoryItem[];
    payouts: Payout[];
    plan?: Record<string, unknown>;
    trades: Trade[];
  },
): Account {
  const startingBalance = numberValue(row.size_usd, 0);
  const resetTime = stringValue(row.last_reset_at) ? new Date(stringValue(row.last_reset_at)).getTime() : 0;
  const tradePnl = relations.trades
    .filter((trade) => new Date(trade.createdAt).getTime() >= resetTime)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const payoutTotal = relations.payouts.reduce((sum, payout) => sum + payout.amount, 0);

  return {
    activationFeesPaid: numberValue(row.activation_fees_usd, 0),
    balance: startingBalance + tradePnl - payoutTotal,
    blownEvaluationCount: numberValue(row.blown_eval_count, 0),
    blownFundedCount: numberValue(row.blown_funded_count, 0),
    firm: stringValue(row.prop_firm),
    fundedAt: stringValue(row.last_activation_at) || undefined,
    history: relations.events,
    id: stringValue(row.id),
    lastResetAt: stringValue(row.last_reset_at) || undefined,
    maxDailyRisk: numberValue(relations.plan?.daily_loss_limit_usd, 0),
    maxDrawdown: numberValue(relations.plan?.trailing_drawdown_usd, 0),
    name: buildAccountName(row, relations.plan),
    payouts: relations.payouts,
    phase: statusToPhase(stringValue(row.status), numberValue(row.blown_eval_count, 0), numberValue(row.blown_funded_count, 0)),
    planId: stringValue(row.plan_id) || undefined,
    planType: stringValue(relations.plan?.plan_type) || stringValue(row.account_type),
    price: numberValue(row.price_usd, 0),
    profitTarget: numberValue(relations.plan?.profit_target_usd, 0),
    resetCostsPaid: numberValue(row.reset_costs_usd, 0),
    resetCount: numberValue(row.resets, 0),
    startingBalance,
  };
}

function rowToSession(row: Record<string, unknown>): TradeSession {
  const parsed = parseJson<Partial<TradeSession>>(stringValue(row.description));
  return {
    accountId: parsed?.accountId ?? "",
    date: parsed?.date ?? stringValue(row.occurred_at).slice(0, 10),
    id: stringValue(row.id),
    market: parsed?.market ?? "",
    plannedRisk: numberValue(parsed?.plannedRisk, 0),
    result: numberValue(parsed?.result, 0),
    review: parsed?.review ?? "",
    status: parsed?.status === "done" || parsed?.status === "missed" ? parsed.status : "planned",
    title: parsed?.title ?? stringValue(row.title),
  };
}

function buildAccountName(row: Record<string, unknown>, plan?: Record<string, unknown>) {
  const size = numberValue(row.size_usd, 0);
  const sizeLabel = size ? formatMoneyCompact(size) : "";
  const planLabel = stripLeadingSize(stringValue(plan?.name) || stringValue(row.account_type) || stringValue(row.plan_id), sizeLabel);
  return [stringValue(row.prop_firm), sizeLabel, planLabel]
    .filter(Boolean)
    .join(" ");
}

function stripLeadingSize(label: string, sizeLabel: string) {
  if (!label || !sizeLabel) return label;
  return label.replace(new RegExp(`^${escapeRegExp(sizeLabel)}\\s+`, "i"), "").trim() || label;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeChecklist(value: unknown): Trade["checklist"] {
  if (!value || typeof value !== "object") return { accountFree: true, neutral: true, setup: true };
  const checklist = value as Partial<Trade["checklist"]>;
  return {
    accountFree: checklist.accountFree !== false,
    neutral: checklist.neutral !== false,
    setup: checklist.setup !== false,
  };
}

function phaseToStatus(phase: AccountPhase) {
  if (phase === "evaluation") return "eval";
  if (phase === "blown_eval" || phase === "blown_funded") return "blown";
  return phase;
}

function statusToPhase(status: string, blownEval: number, blownFunded: number): AccountPhase {
  if (status === "eval" || status === "evaluation") return "evaluation";
  if (status === "funded") return "funded";
  if (status === "live") return "live";
  if (status === "blown_funded") return "blown_funded";
  if (status === "blown_eval") return "blown_eval";
  if (status === "blown") return blownFunded > blownEval ? "blown_funded" : "blown_eval";
  return "evaluation";
}

function normalizeGender(value: unknown): Profile["gender"] {
  return value === "M" || value === "F" || value === "X" ? value : "";
}

function normalizeCadence(value: unknown): QuestCadence {
  return value === "weekly" || value === "monthly" || value === "one_off" ? value : "daily";
}

function normalizeCategory(value: unknown): QuestCategory {
  return questCategories.includes(value as QuestCategory) ? (value as QuestCategory) : "discipline";
}

function normalizeCondition(value: unknown): QuestCondition {
  return value === "reach_target" || value === "stay_under" || value === "to_not_do" ? value : "to_do";
}

function normalizeListType(value: unknown): ListType {
  return value === "goals_1m" ||
    value === "goals_3m" ||
    value === "goals_6m" ||
    value === "goals_12m" ||
    value === "buy" ||
    value === "watch" ||
    value === "read"
    ? value
    : "todo";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTarget(value: number) {
  return Math.round(value * 10) / 10;
}

function parseJson<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "plan";
}
