"use client";

import { getTodayIsoDate } from "@/lib/date";
import { supabase } from "@/lib/supabase/client";

export type LifeDomain =
  | "sport"
  | "work"
  | "piano"
  | "guitare"
  | "language"
  | "health"
  | "meditation"
  | "learning"
  | "trading"
  | "social"
  | "rest"
  | "private";

export type ActivityRepeat = "never" | "daily" | "weekly" | "monthly" | "workday" | "custom";
export type ActivityStatus = "upcoming" | "active" | "paused" | "completed" | "missed" | "adapted";
export type ActivityTemporalState = "now" | "done" | "upcoming" | "delayed" | "missed";
export type TradingAccountPhase = "evaluation" | "funded" | "live" | "blown_eval" | "blown_funded";
export type WorkStatus = "todo" | "active" | "later" | "upcoming" | "completed";
export type ContainerStatus = "active" | "paused" | "terminated" | "archived" | "backlog";
export type PrivateAreaId = "documents" | "finance" | "travel" | "vault";
export type PrivateCategory = "todo" | "buy" | "watch" | "read" | "journal";

export type ExecutionActivity = {
  category: LifeDomain;
  color: string;
  date: string;
  endTime: string;
  finishedAt: string | null;
  icon: string;
  id: string;
  isVirtual: boolean;
  notes: string;
  origin: "life_schedule_blocks" | "trading_states";
  progress: number;
  repeat: ActivityRepeat;
  repeatDays: number[];
  repeatUntil: string | null;
  skipDates: string[];
  sourceId: string;
  startTime: string;
  status: ActivityStatus;
  temporalState: ActivityTemporalState;
  title: string;
};

export type TradingAccount = {
  activationFeesPaid: number;
  balance: number;
  blownEvaluationCount: number;
  blownFundedCount: number;
  firm: string;
  id: string;
  lastResetAt: string | null;
  maxDailyRisk: number;
  name: string;
  phase: TradingAccountPhase;
  planId: string;
  planType: string;
  price: number;
  resetCostsPaid: number;
  resetCount: number;
  startingBalance: number;
};

export type TradingTrade = {
  accountId: string;
  date: string;
  direction: "long" | "short";
  id: string;
  pnl: number;
  symbol: string;
};

export type TradingPayout = {
  accountId: string;
  amount: number;
  date: string;
  id: string;
  source: string;
};

export type TradingPropFirmPlan = {
  accountSize: number;
  dailyLossLimit: number;
  firm: string;
  id: string;
  name: string;
  planType: string;
  price: number;
};

export type WorkTask = {
  deadline: string | null;
  id: string;
  logs: TaskLog[];
  notes: string;
  position: number;
  status: WorkStatus;
  title: string;
  workspaceId: string;
};

export type Workspace = {
  id: string;
  name: string;
  status: Exclude<ContainerStatus, "archived" | "backlog">;
  tasks: WorkTask[];
};

export type ProjectItem = {
  deadline: string | null;
  id: string;
  logs: TaskLog[];
  notes: string;
  position: number;
  projectId: string;
  status: WorkStatus;
  title: string;
};

export type Project = {
  id: string;
  items: ProjectItem[];
  status: "active" | "paused" | "backlog" | "archived";
  title: string;
};

export type TaskLog = {
  body: string;
  createdAt: string;
  id: string;
};

export type PrivateItem = {
  area: PrivateAreaId;
  category: PrivateCategory;
  completed: boolean;
  content: string;
  createdAt: string;
  deadline: string | null;
  id: string;
  title: string;
};

export type JournalEntry = {
  createdAt: string;
  entryDate: string;
  id: string;
  text: string;
};

export type FxOSSnapshot = {
  accounts: TradingAccount[];
  activeProject: Project | null;
  activeWorkspace: Workspace | null;
  currentActivity: ExecutionActivity | null;
  dailyPnl: number;
  journal: JournalEntry[];
  nextActivity: ExecutionActivity | null;
  payouts: TradingPayout[];
  privateItems: PrivateItem[];
  propFirmPlans: TradingPropFirmPlan[];
  projects: Project[];
  selectedDateActivities: ExecutionActivity[];
  todayTrades: TradingTrade[];
  trades: TradingTrade[];
  workspaces: Workspace[];
};

type JsonRecord = Record<string, unknown>;

type LifeScheduleBlockRow = {
  block_date: string;
  category: string | null;
  color: string | null;
  end_time: string;
  finished_at: string | null;
  icon: string | null;
  id: string;
  notes: string | null;
  repeat: string | null;
  repeat_days: unknown;
  repeat_until: string | null;
  skip_dates: unknown;
  start_time: string;
  status: string | null;
  title: string | null;
};

export const activityStatusMap: Record<string, ActivityStatus> = {
  adapted: "adapted",
  active: "active",
  completed: "completed",
  delayed: "adapted",
  done: "completed",
  failed: "missed",
  in_progress: "active",
  missed: "missed",
  open: "upcoming",
  paused: "paused",
  pending: "upcoming",
  planned: "upcoming",
  skipped: "missed",
  todo: "upcoming",
  upcoming: "upcoming",
};

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function loadFxOSSnapshot(userId: string, selectedDate = getTodayIsoDate(), now = new Date()): Promise<FxOSSnapshot> {
  const [schedule, legacySchedule, accounts, trades, payouts, propFirmPlans, workspaces, projects, privateItems, journal] = await Promise.all([
    readSchedule(userId),
    readLegacySchedule(userId),
    readTradingAccounts(userId),
    readTrades(userId),
    readPayouts(userId),
    readPropFirmPlans(),
    readWorkspaces(userId),
    readProjects(userId),
    readPrivateItems(userId),
    readJournalEntries(userId),
  ]);
  const activities = mergeSchedule(schedule, legacySchedule);
  const selectedDateActivities = activities
    .flatMap((activity) => expandActivityForDate(activity, selectedDate))
    .map((activity) => withTemporalState(activity, now, selectedDate))
    .sort(compareActivities);
  const today = getTodayIsoDate();
  const todayActivities = activities
    .flatMap((activity) => expandActivityForDate(activity, today))
    .map((activity) => withTemporalState(activity, now, today))
    .sort(compareActivities);
  const currentActivity =
    selectedDate === today
      ? todayActivities.find((activity) => activity.temporalState === "now") ??
        todayActivities.find((activity) => activity.temporalState === "delayed") ??
        null
      : selectedDateActivities[0] ?? null;
  const nextActivity =
    selectedDateActivities.find((activity) => !["done", "missed", "delayed"].includes(activity.temporalState) && activity.id !== currentActivity?.id) ??
    null;
  const todayTrades = trades.filter((trade) => trade.date === today && trade.symbol !== "ACCOUNT_BLOW");
  const activeWorkspace = workspaces.find((workspace) => workspace.status === "active") ?? null;
  const activeProject = projects.find((project) => project.status === "active") ?? null;

  return {
    accounts,
    activeProject,
    activeWorkspace,
    currentActivity,
    dailyPnl: todayTrades.reduce((sum, trade) => sum + trade.pnl, 0),
    journal,
    nextActivity,
    payouts,
    privateItems,
    propFirmPlans,
    projects,
    selectedDateActivities,
    todayTrades,
    trades,
    workspaces,
  };
}

export function subscribeFxOS(userId: string, onChange: () => void) {
  const channel = supabase.channel(`fx-os-${userId}`);
  [
    "life_schedule_blocks",
    "trading_states",
    "trading_accounts",
    "trading_trades",
    "trading_payouts",
    "trading_account_events",
    "fx_workspaces",
    "fx_workspace_tasks",
    "fx_workspace_task_logs",
    "fx_projects",
    "fx_project_items",
    "fx_project_item_logs",
    "fx_private_items",
    "fx_journal_entries",
  ].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` }, onChange);
  });
  channel.on("postgres_changes", { event: "*", schema: "public", table: "trading_prop_firm_plans" }, onChange);
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function saveActivity(userId: string, input: {
  category: LifeDomain;
  endDate: string | null;
  endTime: string;
  frequency: ActivityRepeat;
  notes: string;
  startDate: string;
  startTime: string;
  title: string;
}) {
  const id = createId("activity");
  const { error } = await supabase.from("life_schedule_blocks").insert({
    block_date: input.startDate,
    category: input.category,
    color: categoryColor(input.category),
    end_time: input.endTime,
    icon: "ellipse-outline",
    id,
    notes: input.notes,
    repeat: input.frequency,
    repeat_days: [],
    repeat_until: input.endDate || null,
    skip_dates: [],
    start_time: input.startTime,
    status: "upcoming",
    title: input.title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function applyPlanningAction(userId: string, activity: ExecutionActivity, action: "complete" | "delay" | "end-early" | "miss") {
  const timestamp = new Date().toISOString();
  const patch = action === "miss"
    ? { status: "missed" as ActivityStatus, paused_at: null, finished_at: null }
    : action === "delay"
    ? { status: "adapted" as ActivityStatus, paused_at: timestamp, finished_at: activity.finishedAt }
    : { status: "completed" as ActivityStatus, paused_at: null, finished_at: timestamp };

  if (activity.origin === "life_schedule_blocks") {
    if (activity.isVirtual) {
      await addSkipDate(userId, activity.sourceId, activity.date);
      const { error } = await supabase.from("life_schedule_blocks").insert({
        block_date: activity.date,
        category: activity.category,
        color: activity.color,
        end_time: activity.endTime,
        finished_at: patch.finished_at,
        icon: activity.icon,
        id: activity.id,
        notes: activity.notes,
        paused_at: patch.paused_at,
        repeat: "never",
        repeat_days: [],
        repeat_until: null,
        skip_dates: [],
        start_time: activity.startTime,
        status: patch.status,
        template_id: activity.sourceId,
        title: activity.title,
        user_id: userId,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("life_schedule_blocks")
        .update({ finished_at: patch.finished_at, paused_at: patch.paused_at, status: patch.status, updated_at: timestamp })
        .eq("user_id", userId)
        .eq("id", activity.sourceId);
      if (error) throw error;
    }
  }
  await patchLegacySchedule(userId, activity, patch.status, patch.finished_at, patch.paused_at);
}

export async function addTrade(userId: string, trade: {
  accountId: string;
  direction: "long" | "short";
  pnl: number;
  symbol: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("trading_trades").insert({
    account_id: trade.accountId,
    closed_at: now,
    contracts: 1,
    direction: trade.direction,
    id: createId("trade"),
    pnl: trade.pnl,
    started_at: now,
    status: "closed",
    symbol: trade.symbol,
    updated_at: now,
    user_id: userId,
  });
  if (error) throw error;
}

export async function addPayout(userId: string, payout: { accountId: string; amount: number; source: string }) {
  const { error } = await supabase.from("trading_payouts").insert({
    account_id: payout.accountId,
    amount_usd: payout.amount,
    id: createId("payout"),
    received_at: getTodayIsoDate(),
    source: payout.source || "Payout",
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
}

export async function addTradingAccount(userId: string, input: {
  planId: string;
  quantity: number;
}) {
  const { data: plan, error: planError } = await supabase
    .from("trading_prop_firm_plans")
    .select("*")
    .eq("id", input.planId)
    .limit(1)
    .single();
  if (planError) throw planError;
  const count = Math.max(1, Math.min(20, Math.round(input.quantity || 1)));
  const rows = Array.from({ length: count }).map((_, index) => {
    const id = createId(`account-${index}`);
    return {
      account_type: stringValue((plan as JsonRecord).plan_type),
      activation_fees_usd: 0,
      activations: 0,
      blown_eval_count: 0,
      blown_funded_count: 0,
      bought_at: getTodayIsoDate(),
      id,
      plan_id: input.planId,
      price_usd: numberValue((plan as JsonRecord).price_usd, 0),
      prop_firm: stringValue((plan as JsonRecord).prop_firm),
      reset_costs_usd: 0,
      resets: 0,
      size_usd: numberValue((plan as JsonRecord).account_size_usd, 0),
      status: "eval",
      updated_at: new Date().toISOString(),
      user_id: userId,
    };
  });
  const { error } = await supabase.from("trading_accounts").insert(rows);
  if (error) throw error;
  await Promise.all(rows.map((row) => addAccountEvent(userId, row.id, "account_created", "Account created", `${row.prop_firm} ${row.account_type} ${row.size_usd}`)));
}

export async function updateAccountStatus(userId: string, account: TradingAccount, phase: TradingAccountPhase) {
  const patch: Record<string, unknown> = {
    status: phaseToStatus(phase),
    updated_at: new Date().toISOString(),
  };
  if (phase === "funded") patch.last_activation_at = new Date().toISOString();
  if (phase === "blown_eval") patch.blown_eval_count = account.blownEvaluationCount + 1;
  if (phase === "blown_funded") patch.blown_funded_count = account.blownFundedCount + 1;
  const { error } = await supabase.from("trading_accounts").update(patch).eq("user_id", userId).eq("id", account.id);
  if (error) throw error;
  await addAccountEvent(userId, account.id, "status_changed", `Set ${phaseToStatus(phase)}`, account.name);
}

export async function resetAccount(userId: string, account: TradingAccount, cost: number) {
  const { error } = await supabase.from("trading_accounts").update({
    last_reset_at: new Date().toISOString(),
    reset_costs_usd: account.resetCostsPaid + Math.max(0, cost),
    resets: account.resetCount + 1,
    status: "eval",
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("id", account.id);
  if (error) throw error;
  await addAccountEvent(userId, account.id, "reset", "Account reset", `Reset cost ${Math.max(0, cost)}`);
}

export async function saveWorkspace(userId: string, name: string) {
  const { error } = await supabase.from("fx_workspaces").insert({
    id: createId("workspace"),
    name,
    status: "paused",
    user_id: userId,
  });
  if (error) throw error;
}

export async function setWorkspaceStatus(userId: string, workspaceId: string, status: Workspace["status"]) {
  if (status === "active") {
    await supabase.from("fx_workspaces").update({ status: "paused" }).eq("user_id", userId).eq("status", "active");
  }
  const { error } = await supabase.from("fx_workspaces").update({ status, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", workspaceId);
  if (error) throw error;
}

export async function saveWorkspaceTask(userId: string, input: {
  deadline: string | null;
  notes: string;
  status: WorkStatus;
  title: string;
  workspaceId: string;
}) {
  const position = Date.now();
  const { error } = await supabase.from("fx_workspace_tasks").insert({
    deadline: input.deadline,
    id: createId("task"),
    notes: input.notes,
    position,
    status: input.status,
    title: input.title,
    user_id: userId,
    workspace_id: input.workspaceId,
  });
  if (error) throw error;
}

export async function updateWorkspaceTask(userId: string, taskId: string, patch: Partial<Pick<WorkTask, "deadline" | "notes" | "status" | "title">>) {
  const { error } = await supabase.from("fx_workspace_tasks").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", taskId);
  if (error) throw error;
}

export async function deleteWorkspaceTask(userId: string, taskId: string) {
  const { error } = await supabase.from("fx_workspace_tasks").delete().eq("user_id", userId).eq("id", taskId);
  if (error) throw error;
}

export async function addWorkspaceTaskLog(userId: string, taskId: string, body: string) {
  const { error } = await supabase.from("fx_workspace_task_logs").insert({ body, id: createId("log"), task_id: taskId, user_id: userId });
  if (error) throw error;
}

export async function updateWorkspaceTaskLog(userId: string, logId: string, body: string) {
  const { error } = await supabase.from("fx_workspace_task_logs").update({ body }).eq("user_id", userId).eq("id", logId);
  if (error) throw error;
}

export async function deleteWorkspaceTaskLog(userId: string, logId: string) {
  const { error } = await supabase.from("fx_workspace_task_logs").delete().eq("user_id", userId).eq("id", logId);
  if (error) throw error;
}

export async function saveProject(userId: string, title: string) {
  const { error } = await supabase.from("fx_projects").insert({
    id: createId("project"),
    status: "paused",
    title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function setProjectStatus(userId: string, projectId: string, status: Project["status"]) {
  if (status === "active") {
    await supabase.from("fx_projects").update({ status: "paused" }).eq("user_id", userId).eq("status", "active");
  }
  const { error } = await supabase.from("fx_projects").update({ status, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", projectId);
  if (error) throw error;
}

export async function updateProject(userId: string, projectId: string, patch: Partial<Pick<Project, "status" | "title">>) {
  const { error } = await supabase.from("fx_projects").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", projectId);
  if (error) throw error;
}

export async function deleteProject(userId: string, projectId: string) {
  const { error } = await supabase.from("fx_projects").delete().eq("user_id", userId).eq("id", projectId);
  if (error) throw error;
}

export async function saveProjectItem(userId: string, input: {
  deadline: string | null;
  notes: string;
  projectId: string;
  status: WorkStatus;
  title: string;
}) {
  const { error } = await supabase.from("fx_project_items").insert({
    deadline: input.deadline,
    id: createId("project-item"),
    notes: input.notes,
    position: Date.now(),
    project_id: input.projectId,
    status: input.status,
    title: input.title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function updateProjectItem(userId: string, itemId: string, patch: Partial<Pick<ProjectItem, "deadline" | "notes" | "status" | "title">>) {
  const { error } = await supabase.from("fx_project_items").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", itemId);
  if (error) throw error;
}

export async function deleteProjectItem(userId: string, itemId: string) {
  const { error } = await supabase.from("fx_project_items").delete().eq("user_id", userId).eq("id", itemId);
  if (error) throw error;
}

export async function addProjectItemLog(userId: string, itemId: string, body: string) {
  const { error } = await supabase.from("fx_project_item_logs").insert({ body, id: createId("log"), item_id: itemId, user_id: userId });
  if (error) throw error;
}

export async function updateProjectItemLog(userId: string, logId: string, body: string) {
  const { error } = await supabase.from("fx_project_item_logs").update({ body }).eq("user_id", userId).eq("id", logId);
  if (error) throw error;
}

export async function deleteProjectItemLog(userId: string, logId: string) {
  const { error } = await supabase.from("fx_project_item_logs").delete().eq("user_id", userId).eq("id", logId);
  if (error) throw error;
}

export async function savePrivateItem(userId: string, input: {
  area: PrivateAreaId;
  category: PrivateCategory;
  content: string;
  deadline: string | null;
  title: string;
}) {
  const row = {
    area: input.area,
    category: input.category,
    content: input.content,
    id: createId("private"),
    title: input.title,
    user_id: userId,
  };
  const { error } = await supabase.from("fx_private_items").insert({ ...row, deadline: input.deadline });
  if (isMissingColumnError(error, "deadline")) {
    const retry = await supabase.from("fx_private_items").insert(row);
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function updatePrivateItem(userId: string, itemId: string, patch: Partial<Pick<PrivateItem, "completed" | "content" | "deadline" | "title">>) {
  const payload = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("fx_private_items").update(payload).eq("user_id", userId).eq("id", itemId);
  if (isMissingColumnError(error, "deadline")) {
    const fallbackPatch: Record<string, unknown> = { ...patch };
    delete fallbackPatch.deadline;
    const retry = await supabase.from("fx_private_items").update({ ...fallbackPatch, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", itemId);
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function saveJournalEntry(userId: string, text: string, entryDate = getTodayIsoDate()) {
  const { error } = await supabase.from("fx_journal_entries").insert({
    entry_date: entryDate,
    id: createId("journal"),
    text,
    user_id: userId,
  });
  if (error) throw error;
}

async function readSchedule(userId: string): Promise<ExecutionActivity[]> {
  const { data, error } = await supabase
    .from("life_schedule_blocks")
    .select("id,title,category,icon,color,block_date,start_time,end_time,repeat,repeat_days,repeat_until,skip_dates,status,notes,finished_at")
    .eq("user_id", userId)
    .returns<LifeScheduleBlockRow[]>();
  if (error) return [];
  return (data ?? []).map(rowToActivity);
}

async function readLegacySchedule(userId: string): Promise<ExecutionActivity[]> {
  const { data, error } = await supabase.from("trading_states").select("state").eq("user_id", userId).limit(1);
  if (error) return [];
  const state = (data?.[0] as { state?: unknown } | undefined)?.state;
  if (!isRecord(state)) return [];
  const blocks = Array.isArray(state.scheduleBlocks) ? state.scheduleBlocks.map(legacyBlockToActivity).filter((item): item is ExecutionActivity => Boolean(item)) : [];
  const sleep = legacySleepToActivity(state);
  return sleep ? [...blocks, sleep] : blocks;
}

async function readTradingAccounts(userId: string): Promise<TradingAccount[]> {
  const [accounts, plans, trades, payouts] = await Promise.all([
    supabase.from("trading_accounts").select("*").eq("user_id", userId),
    supabase.from("trading_prop_firm_plans").select("*"),
    supabase.from("trading_trades").select("*").eq("user_id", userId),
    supabase.from("trading_payouts").select("*").eq("user_id", userId),
  ]);
  if (accounts.error) return [];
  const plansById = new Map((plans.data ?? []).map((plan: JsonRecord) => [stringValue(plan.id), plan]));
  const tradesByAccount = groupBy((trades.data ?? []) as JsonRecord[], (trade) => stringValue(trade.account_id));
  const payoutsByAccount = groupBy((payouts.data ?? []) as JsonRecord[], (payout) => stringValue(payout.account_id));
  return ((accounts.data ?? []) as JsonRecord[]).map((row) => rowToAccount(row, plansById.get(stringValue(row.plan_id)), tradesByAccount.get(stringValue(row.id)) ?? [], payoutsByAccount.get(stringValue(row.id)) ?? []));
}

async function readPropFirmPlans(): Promise<TradingPropFirmPlan[]> {
  const { data, error } = await supabase
    .from("trading_prop_firm_plans")
    .select("*")
    .order("prop_firm", { ascending: true })
    .order("account_size_usd", { ascending: true });
  if (error) return [];
  return ((data ?? []) as JsonRecord[]).map(rowToPropFirmPlan);
}

async function readTrades(userId: string): Promise<TradingTrade[]> {
  const { data, error } = await supabase.from("trading_trades").select("*").eq("user_id", userId).order("started_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as JsonRecord[]).filter((row) => stringValue(row.status) !== "deleted").map(rowToTrade);
}

async function readPayouts(userId: string): Promise<TradingPayout[]> {
  const { data, error } = await supabase.from("trading_payouts").select("*").eq("user_id", userId).order("received_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as JsonRecord[]).map((row) => ({
    accountId: stringValue(row.account_id),
    amount: numberValue(row.amount_usd, 0),
    date: stringValue(row.received_at),
    id: stringValue(row.id),
    source: stringValue(row.source),
  }));
}

async function readWorkspaces(userId: string): Promise<Workspace[]> {
  const [workspaces, tasks, logs] = await Promise.all([
    supabase.from("fx_workspaces").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("fx_workspace_tasks").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("fx_workspace_task_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  if (workspaces.error) return [];
  const logsByTask = groupBy((logs.data ?? []) as JsonRecord[], (log) => stringValue(log.task_id));
  const tasksByWorkspace = groupBy(((tasks.data ?? []) as JsonRecord[]).map((task) => rowToWorkTask(task, logsByTask.get(stringValue(task.id)) ?? [])), (task) => task.workspaceId);
  return ((workspaces.data ?? []) as JsonRecord[]).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    status: normalizeWorkspaceStatus(row.status),
    tasks: tasksByWorkspace.get(stringValue(row.id)) ?? [],
  }));
}

async function readProjects(userId: string): Promise<Project[]> {
  const [projects, items, logs] = await Promise.all([
    supabase.from("fx_projects").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("fx_project_items").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("fx_project_item_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  if (projects.error) return [];
  const logsByItem = groupBy((logs.data ?? []) as JsonRecord[], (log) => stringValue(log.item_id));
  const itemsByProject = groupBy(((items.data ?? []) as JsonRecord[]).map((item) => rowToProjectItem(item, logsByItem.get(stringValue(item.id)) ?? [])), (item) => item.projectId);
  return ((projects.data ?? []) as JsonRecord[]).map((row) => ({
    id: stringValue(row.id),
    items: itemsByProject.get(stringValue(row.id)) ?? [],
    status: normalizeProjectStatus(row.status),
    title: stringValue(row.title),
  }));
}

async function readPrivateItems(userId: string): Promise<PrivateItem[]> {
  const { data, error } = await supabase
    .from("fx_private_items")
    .select("id,area,category,title,content,deadline,completed,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (isMissingColumnError(error, "deadline")) {
    const fallback = await supabase
      .from("fx_private_items")
      .select("id,area,category,title,content,completed,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (fallback.error) return [];
    return rowsToPrivateItems(fallback.data ?? []);
  }
  if (error) return [];
  return rowsToPrivateItems(data ?? []);
}

function rowsToPrivateItems(rows: unknown[]): PrivateItem[] {
  return (rows as JsonRecord[]).map((row) => ({
    area: normalizePrivateArea(row.area),
    category: normalizePrivateCategory(row.category),
    completed: row.completed === true,
    content: stringValue(row.content),
    createdAt: stringValue(row.created_at),
    deadline: normalizeNullableDate(row.deadline),
    id: stringValue(row.id),
    title: stringValue(row.title),
  }));
}

async function readJournalEntries(userId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase.from("fx_journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as JsonRecord[]).map((row) => ({
    createdAt: stringValue(row.created_at),
    entryDate: stringValue(row.entry_date),
    id: stringValue(row.id),
    text: stringValue(row.text),
  }));
}

function rowToActivity(row: LifeScheduleBlockRow): ExecutionActivity {
  const category = normalizeLifeDomain(row.category);
  return {
    category,
    color: row.color ?? categoryColor(category),
    date: normalizeIsoDate(row.block_date),
    endTime: normalizeTime(row.end_time),
    finishedAt: row.finished_at,
    icon: row.icon ?? "ellipse-outline",
    id: row.id,
    isVirtual: false,
    notes: row.notes ?? "",
    origin: "life_schedule_blocks",
    progress: 0,
    repeat: normalizeRepeat(row.repeat),
    repeatDays: normalizeNumberArray(row.repeat_days),
    repeatUntil: normalizeNullableDate(row.repeat_until),
    skipDates: normalizeStringArray(row.skip_dates),
    sourceId: row.id,
    startTime: normalizeTime(row.start_time),
    status: normalizeActivityStatus(row.status),
    temporalState: "upcoming",
    title: row.title?.trim() || domainLabel(category),
  };
}

function legacyBlockToActivity(value: unknown): ExecutionActivity | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const date = normalizeIsoDate(value.date);
  if (!id || !date) return null;
  const category = normalizeLifeDomain(value.category);
  return {
    category,
    color: stringValue(value.color) || categoryColor(category),
    date,
    endTime: normalizeTime(value.endTime),
    finishedAt: nullableString(value.finishedAt),
    icon: stringValue(value.icon) || "ellipse-outline",
    id,
    isVirtual: false,
    notes: stringValue(value.notes),
    origin: "trading_states",
    progress: 0,
    repeat: normalizeRepeat(value.repeat),
    repeatDays: normalizeNumberArray(value.repeatDays),
    repeatUntil: normalizeNullableDate(value.repeatUntil),
    skipDates: normalizeStringArray(value.skipDates),
    sourceId: id,
    startTime: normalizeTime(value.startTime),
    status: normalizeActivityStatus(value.status),
    temporalState: "upcoming",
    title: stringValue(value.title) || domainLabel(category),
  };
}

function legacySleepToActivity(state: JsonRecord): ExecutionActivity | null {
  const settings = isRecord(state.appSettings) ? state.appSettings : null;
  const startTime = normalizeTime(settings?.sleepStartTime);
  const endTime = normalizeTime(settings?.sleepEndTime);
  if (!settings || startTime === endTime) return null;
  return {
    category: "rest",
    color: categoryColor("rest"),
    date: "2020-01-01",
    endTime,
    finishedAt: null,
    icon: "moon-outline",
    id: "legacy-sleep",
    isVirtual: true,
    notes: "",
    origin: "trading_states",
    progress: 0,
    repeat: "daily",
    repeatDays: [],
    repeatUntil: null,
    skipDates: [],
    sourceId: "legacy-sleep",
    startTime,
    status: "upcoming",
    temporalState: "upcoming",
    title: "Sleep",
  };
}

function rowToAccount(row: JsonRecord, plan: JsonRecord | undefined, trades: JsonRecord[], payouts: JsonRecord[]): TradingAccount {
  const startingBalance = numberValue(row.size_usd, 0);
  const tradePnl = trades.filter((trade) => stringValue(trade.status) !== "deleted").reduce((sum, trade) => sum + numberValue(trade.pnl, 0), 0);
  const payoutTotal = payouts.reduce((sum, payout) => sum + numberValue(payout.amount_usd, 0), 0);
  const firm = stringValue(row.prop_firm) || stringValue(plan?.prop_firm);
  const planType = stringValue(plan?.plan_type) || stringValue(row.account_type);
  const sizeLabel = startingBalance ? `${startingBalance / 1000}K` : "";
  return {
    activationFeesPaid: numberValue(row.activation_fees_usd, 0),
    balance: startingBalance + tradePnl - payoutTotal,
    blownEvaluationCount: numberValue(row.blown_eval_count, 0),
    blownFundedCount: numberValue(row.blown_funded_count, 0),
    firm,
    id: stringValue(row.id),
    lastResetAt: nullableString(row.last_reset_at),
    maxDailyRisk: numberValue(plan?.daily_loss_limit_usd, 0),
    name: [firm, sizeLabel, planType].filter(Boolean).join(" "),
    phase: statusToPhase(stringValue(row.status), numberValue(row.blown_eval_count, 0), numberValue(row.blown_funded_count, 0)),
    planId: stringValue(row.plan_id),
    planType,
    price: numberValue(row.price_usd, 0),
    resetCostsPaid: numberValue(row.reset_costs_usd, 0),
    resetCount: numberValue(row.resets, 0),
    startingBalance,
  };
}

function rowToPropFirmPlan(row: JsonRecord): TradingPropFirmPlan {
  return {
    accountSize: numberValue(row.account_size_usd, 0),
    dailyLossLimit: numberValue(row.daily_loss_limit_usd, 0),
    firm: stringValue(row.prop_firm),
    id: stringValue(row.id),
    name: stringValue(row.name),
    planType: stringValue(row.plan_type),
    price: numberValue(row.price_usd, 0),
  };
}

function rowToTrade(row: JsonRecord): TradingTrade {
  const startedAt = stringValue(row.started_at) || stringValue(row.closed_at);
  return {
    accountId: stringValue(row.account_id),
    date: normalizeIsoDate(startedAt),
    direction: stringValue(row.direction) === "short" ? "short" : "long",
    id: stringValue(row.id),
    pnl: numberValue(row.pnl, 0),
    symbol: stringValue(row.symbol),
  };
}

function rowToWorkTask(row: JsonRecord, logs: JsonRecord[]): WorkTask {
  return {
    deadline: normalizeNullableDate(row.deadline),
    id: stringValue(row.id),
    logs: logs.map(rowToLog),
    notes: stringValue(row.notes),
    position: numberValue(row.position, 0),
    status: normalizeWorkStatus(row.status),
    title: stringValue(row.title),
    workspaceId: stringValue(row.workspace_id),
  };
}

function rowToProjectItem(row: JsonRecord, logs: JsonRecord[]): ProjectItem {
  return {
    deadline: normalizeNullableDate(row.deadline),
    id: stringValue(row.id),
    logs: logs.map(rowToLog),
    notes: stringValue(row.notes),
    position: numberValue(row.position, 0),
    projectId: stringValue(row.project_id),
    status: normalizeWorkStatus(row.status),
    title: stringValue(row.title),
  };
}

function rowToLog(row: JsonRecord): TaskLog {
  return {
    body: stringValue(row.body),
    createdAt: stringValue(row.created_at),
    id: stringValue(row.id),
  };
}

function mergeSchedule(primary: ExecutionActivity[], legacy: ExecutionActivity[]) {
  const seen = new Set(primary.map((activity) => activity.id));
  return [...primary, ...legacy.filter((activity) => !seen.has(activity.id))];
}

function expandActivityForDate(activity: ExecutionActivity, date: string): ExecutionActivity[] {
  if (activity.skipDates.includes(date)) return [];
  if (activity.date === date) return [activity];
  if (!doesRepeatOnDate(activity, date)) return [];
  return [{ ...activity, date, finishedAt: null, id: `${activity.sourceId}:${date}`, isVirtual: true, status: "upcoming" }];
}

function doesRepeatOnDate(activity: ExecutionActivity, date: string) {
  if (activity.repeat === "never" || date < activity.date || (activity.repeatUntil && date > activity.repeatUntil)) return false;
  const sourceDate = new Date(`${activity.date}T00:00:00`);
  const candidateDate = new Date(`${date}T00:00:00`);
  if (activity.repeat === "daily") return true;
  if (activity.repeat === "workday") return candidateDate.getDay() >= 1 && candidateDate.getDay() <= 5;
  if (activity.repeat === "weekly") return (activity.repeatDays.length ? activity.repeatDays : [sourceDate.getDay()]).includes(candidateDate.getDay());
  if (activity.repeat === "monthly") return sourceDate.getDate() === candidateDate.getDate();
  return false;
}

function withTemporalState(activity: ExecutionActivity, now: Date, selectedDate: string): ExecutionActivity {
  const today = getTodayIsoDate();
  const currentMinute = getParisMinute(now);
  const start = toMinutes(activity.startTime);
  let end = toMinutes(activity.endTime);
  let minute = currentMinute;
  if (end <= start) {
    end += 1440;
    if (minute < toMinutes(activity.endTime)) minute += 1440;
  }
  let temporalState: ActivityTemporalState = "upcoming";
  if (activity.status === "completed" || activity.finishedAt) temporalState = "done";
  else if (activity.status === "missed") temporalState = "missed";
  else if (selectedDate < today) temporalState = "done";
  else if (selectedDate > today) temporalState = "upcoming";
  else if (minute >= end) temporalState = "done";
  else if (minute >= start) temporalState = "now";
  const progress = Math.max(0, Math.min(1, (minute - start) / Math.max(1, end - start)));
  return { ...activity, progress: temporalState === "done" ? 1 : progress, temporalState };
}

async function addSkipDate(userId: string, sourceId: string, date: string) {
  const { data } = await supabase.from("life_schedule_blocks").select("skip_dates").eq("user_id", userId).eq("id", sourceId).limit(1);
  const current = normalizeStringArray((data?.[0] as { skip_dates?: unknown } | undefined)?.skip_dates);
  await supabase.from("life_schedule_blocks").update({ skip_dates: Array.from(new Set([...current, date])) }).eq("user_id", userId).eq("id", sourceId);
}

async function patchLegacySchedule(userId: string, activity: ExecutionActivity, status: ActivityStatus, finishedAt: string | null, pausedAt: string | null) {
  const { data, error } = await supabase.from("trading_states").select("state").eq("user_id", userId).limit(1);
  if (error || !data?.length) return;
  const state = ((data[0] as { state?: unknown }).state ?? {}) as JsonRecord;
  const scheduleBlocks = Array.isArray(state.scheduleBlocks) ? state.scheduleBlocks : [];
  const next = scheduleBlocks.map((block) => {
    if (!isRecord(block)) return block;
    if (stringValue(block.id) !== activity.sourceId) return block;
    return { ...block, finishedAt, pausedAt, status };
  });
  await supabase.from("trading_states").upsert({ state: { ...state, scheduleBlocks: next }, updated_at: new Date().toISOString(), user_id: userId }, { onConflict: "user_id" });
}

async function addAccountEvent(userId: string, accountId: string, type: string, title: string, description: string) {
  await supabase.from("trading_account_events").insert({
    account_id: accountId,
    description,
    id: createId("account-event"),
    occurred_at: new Date().toISOString(),
    title,
    type,
    updated_at: new Date().toISOString(),
    user_id: userId,
  });
}

function compareActivities(left: ExecutionActivity, right: ExecutionActivity) {
  return `${left.date}${left.startTime}${left.id}`.localeCompare(`${right.date}${right.startTime}${right.id}`);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return map;
}

function phaseToStatus(phase: TradingAccountPhase) {
  if (phase === "evaluation") return "eval";
  if (phase === "blown_eval" || phase === "blown_funded") return "blown";
  return phase;
}

function statusToPhase(status: string, blownEval: number, blownFunded: number): TradingAccountPhase {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "eval" || normalized === "evaluation") return "evaluation";
  if (normalized === "funded") return "funded";
  if (normalized === "live") return "live";
  if (normalized === "blown_funded") return "blown_funded";
  if (normalized === "blown_eval") return "blown_eval";
  if (normalized === "blown") return blownFunded > blownEval ? "blown_funded" : "blown_eval";
  return "evaluation";
}

function normalizeActivityStatus(value: unknown): ActivityStatus {
  return activityStatusMap[stringValue(value).toLowerCase()] ?? "upcoming";
}

function normalizeRepeat(value: unknown): ActivityRepeat {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "workday" || value === "custom" ? value : "never";
}

function normalizeLifeDomain(value: unknown): LifeDomain {
  const domain = stringValue(value);
  if (["sport", "work", "piano", "guitare", "language", "health", "meditation", "learning", "trading", "social", "rest", "private"].includes(domain)) return domain as LifeDomain;
  return "work";
}

function normalizeWorkStatus(value: unknown): WorkStatus {
  const status = stringValue(value);
  if (status === "active" || status === "completed") return status;
  if (status === "later" || status === "upcoming") return "todo";
  return "todo";
}

function normalizeWorkspaceStatus(value: unknown): Workspace["status"] {
  return value === "active" || value === "terminated" ? value : "paused";
}

function normalizeProjectStatus(value: unknown): Project["status"] {
  return value === "active" || value === "paused" || value === "archived" ? value : "backlog";
}

function normalizePrivateArea(value: unknown): PrivateAreaId {
  return value === "finance" || value === "travel" || value === "vault" ? value : "documents";
}

function normalizePrivateCategory(value: unknown): PrivateCategory {
  return value === "buy" || value === "watch" || value === "read" || value === "journal" ? value : "todo";
}

function normalizeTime(value: unknown) {
  const match = /^(\d{1,2}):(\d{2})/.exec(stringValue(value));
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "00:00";
}

function normalizeIsoDate(value: unknown) {
  return /^(\d{4}-\d{2}-\d{2})/.exec(stringValue(value))?.[1] ?? "";
}

function normalizeNullableDate(value: unknown) {
  return normalizeIsoDate(value) || null;
}

function normalizeNumberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((item) => Number.isInteger(item)) : [];
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMissingColumnError(error: unknown, column: string) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      "message" in error &&
      (error as { code?: unknown; message?: unknown }).code === "42703" &&
      String((error as { message?: unknown }).message).includes(column),
  );
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function getParisMinute(date: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "Europe/Paris" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
}

function categoryColor(category: LifeDomain) {
  const colors: Record<LifeDomain, string> = {
    guitare: "#C084FC",
    health: "#69D2E7",
    language: "#FACC15",
    learning: "#FFD166",
    meditation: "#9CE6B6",
    piano: "#C084FC",
    private: "#B8C2B8",
    rest: "#85A6FF",
    social: "#F4A261",
    sport: "#6EF6A4",
    trading: "#85A6FF",
    work: "#20E0D0",
  };
  return colors[category];
}

function domainLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
