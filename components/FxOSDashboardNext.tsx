"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Archive,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Crosshair,
  DoorOpen,
  Edit3,
  FileText,
  Folder,
  FolderOpen,
  LayoutList,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Palette,
  Pause,
  Plane,
  Play,
  Plus,
  RefreshCw,
  Square,
  Target,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";
import DashboardLogoutButton from "@/components/DashboardLogoutButton";
import { cn } from "@/lib/cn";
import { getTodayIsoDate } from "@/lib/date";
import {
  addPayout,
  addProjectItemLog,
  addTrade,
  addTradingAccount,
  addWorkspaceTaskLog,
  applyPlanningAction,
  deleteProject,
  deleteProjectItem,
  deleteProjectItemLog,
  deleteWorkspaceTaskLog,
  deleteWorkspaceTask,
  getCurrentUserId,
  loadFxOSSnapshot,
  resetAccount,
  saveActivity,
  saveJournalEntry,
  savePrivateItem,
  saveProject,
  saveProjectItem,
  saveWorkspace,
  saveWorkspaceTask,
  setProjectStatus,
  setWorkspaceStatus,
  subscribeFxOS,
  updateAccountStatus,
  updatePrivateItem,
  updateProject,
  updateProjectItem,
  updateProjectItemLog,
  updateWorkspaceTaskLog,
  updateWorkspaceTask,
  type ActivityRepeat,
  type ActivityTemporalState,
  type ExecutionActivity,
  type FxOSSnapshot,
  type LifeDomain,
  type PrivateAreaId,
  type PrivateCategory,
  type PrivateItem,
  type Project,
  type ProjectItem,
  type TradingAccount,
  type TradingAccountPhase,
  type TradingPropFirmPlan,
  type TradingTrade,
  type WorkStatus,
  type Workspace,
  type WorkTask,
} from "@/lib/fx-os";

type FocusTab = "planning" | "trading";
type PlanningMode = "ring" | "day";
export type FxOSMainView = "focus" | "work" | "projects" | "private";
type ModalKind =
  | "activity"
  | "calendar"
  | "trade"
  | "payout"
  | "account"
  | "workspace"
  | "workspace-task"
  | "project"
  | "project-edit"
  | "project-item"
  | "private-item"
  | "journal"
  | "logs"
  | null;
type AccentTheme = "teal" | "gold" | "violet" | "blue" | "emerald" | "rose" | "white";
type PrivateFilter = PrivateCategory | "all" | "completed";

type FxOSDashboardProps = {
  email: string;
  initialFocusTab?: FocusTab;
  initialView?: FxOSMainView;
};

const navItems = [
  { icon: Target, label: "Focus", value: "focus" },
  { icon: Briefcase, label: "Work", value: "work" },
  { icon: Folder, label: "Projects", value: "projects" },
  { icon: LockKeyhole, label: "Private", value: "private" },
] satisfies Array<{ icon: typeof Target; label: string; value: FxOSMainView }>;

const domains: LifeDomain[] = ["work", "trading", "sport", "piano", "guitare", "language", "learning", "health", "meditation", "social", "rest", "private"];
const repeats: ActivityRepeat[] = ["never", "daily", "workday", "weekly", "monthly"];
const workStatuses: WorkStatus[] = ["todo", "active", "completed"];
const projectStatuses: Project["status"][] = ["active", "paused", "archived"];
const workspaceStatuses: Workspace["status"][] = ["active", "paused", "terminated"];
const accountFilters = ["all", "active", "eval", "funded", "live", "blown"] as const;
const accentThemes: AccentTheme[] = ["teal", "gold", "violet", "blue", "emerald", "rose", "white"];
const statusIcons: Record<string, typeof Play> = {
  active: Play,
  all: LayoutList,
  archived: Archive,
  paused: Pause,
  terminated: Archive,
};
const privateAreas: Array<{ icon: typeof FileText; id: PrivateAreaId; subtitle: string; title: string }> = [
  { icon: FileText, id: "documents", subtitle: "Lists & decisions", title: "Documents" },
  { icon: WalletCards, id: "finance", subtitle: "Journal & money notes", title: "Finance" },
  { icon: Plane, id: "travel", subtitle: "Ideas & plans", title: "Travel" },
  { icon: LockKeyhole, id: "vault", subtitle: "Locked", title: "Vault" },
];

export default function FxOSDashboardNext({ email, initialFocusTab = "planning", initialView = "focus" }: FxOSDashboardProps) {
  const [activeView, setActiveView] = useState<FxOSMainView>(initialView);
  const [focusTab, setFocusTab] = useState<FocusTab>(initialFocusTab);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("ring");
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());
  const [focusOnly, setFocusOnly] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<FxOSSnapshot | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountDetailId, setAccountDetailId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workspaceDetailId, setWorkspaceDetailId] = useState("");
  const [projectDetailId, setProjectDetailId] = useState("");
  const [accountFilter, setAccountFilter] = useState<(typeof accountFilters)[number]>("active");
  const [taskFilter, setTaskFilter] = useState<WorkStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState<Project["status"] | "all">("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<Workspace["status"] | "all">("all");
  const [privateArea, setPrivateArea] = useState<PrivateAreaId | null>(null);
  const [privateFilter, setPrivateFilter] = useState<PrivateFilter>("all");
  const [theme, setTheme] = useState<AccentTheme>("teal");
  const [logTarget, setLogTarget] = useState<{ item: ProjectItem | WorkTask; type: "project" | "work" } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");

  const refresh = useCallback(async (targetUserId: string, targetDate = selectedDate) => {
    setError("");
    try {
      const next = await loadFxOSSnapshot(targetUserId, targetDate);
      setSnapshot(next);
      setSelectedAccountId((current) => current || next.accounts[0]?.id || "");
      setSelectedWorkspaceId((current) => current || next.activeWorkspace?.id || next.workspaces[0]?.id || "");
      setSelectedProjectId((current) => current || next.activeProject?.id || next.projects[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Fx OS.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    let mounted = true;
    getCurrentUserId().then((id) => {
      if (!mounted) return;
      setUserId(id);
      if (!id) {
        setLoading(false);
        setError("No active Supabase session.");
        return;
      }
      void refresh(id, selectedDate);
    });
    return () => {
      mounted = false;
    };
  }, [refresh, selectedDate]);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeFxOS(userId, () => void refresh(userId, selectedDate));
  }, [refresh, selectedDate, userId]);

  const selectedAccount = useMemo(() => snapshot?.accounts.find((account) => account.id === selectedAccountId) ?? snapshot?.accounts[0] ?? null, [selectedAccountId, snapshot]);
  const accountDetail = useMemo(() => snapshot?.accounts.find((account) => account.id === accountDetailId) ?? null, [accountDetailId, snapshot]);
  const selectedWorkspace = useMemo(() => snapshot?.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? snapshot?.activeWorkspace ?? snapshot?.workspaces[0] ?? null, [selectedWorkspaceId, snapshot]);
  const selectedProject = useMemo(() => snapshot?.projects.find((project) => project.id === selectedProjectId) ?? snapshot?.activeProject ?? snapshot?.projects[0] ?? null, [selectedProjectId, snapshot]);
  const workspaceDetail = useMemo(() => snapshot?.workspaces.find((workspace) => workspace.id === workspaceDetailId) ?? null, [snapshot, workspaceDetailId]);
  const projectDetail = useMemo(() => snapshot?.projects.find((project) => project.id === projectDetailId) ?? null, [projectDetailId, snapshot]);
  const currentLogTarget = useMemo(() => logTarget && snapshot ? resolveLogTarget(snapshot, logTarget) ?? logTarget : logTarget, [logTarget, snapshot]);

  const run = useCallback(async (key: string, action: () => Promise<void>, options: { closeModal?: boolean } = {}) => {
    if (!userId) return;
    setPending(key);
    setError("");
    try {
      await action();
      await refresh(userId, selectedDate);
      if (options.closeModal !== false) {
        setModal(null);
      }
    } catch (actionError) {
      setError(getActionErrorMessage(actionError));
    } finally {
      setPending("");
    }
  }, [refresh, selectedDate, userId]);

  function openCalendarDate(date: string) {
    setSelectedDate(date);
    setModal(null);
    if (userId) void refresh(userId, date);
  }

  function handleNavigate(view: FxOSMainView) {
    setActiveView(view);
    if (view === "focus") {
      setFocusTab("planning");
      setPlanningMode("ring");
    }
    setAccountDetailId("");
    setWorkspaceDetailId("");
    setProjectDetailId("");
    setPrivateArea(null);
    setTaskFilter("all");
    setProjectFilter("all");
    setWorkspaceFilter("all");
    setPrivateFilter("all");
    setModal(null);
  }

  if (focusOnly) {
    return (
      <main className="fx-focus-only" style={themeStyle(theme)}>
        {snapshot ? (
          <PrimaryPanel eyebrow={planningEyebrow(selectedDate)}>
            <PlanningRing activity={snapshot.currentActivity} compact />
          </PrimaryPanel>
        ) : <LoadingState />}
        <button className="fx-primary-action fx-exit-focus" type="button" onClick={() => setFocusOnly(false)}>
          <DoorOpen className="h-5 w-5" aria-hidden="true" />
          Exit focus mode
        </button>
      </main>
    );
  }

  return (
    <main className={cn("fx-os-shell", activeView === "focus" && "fx-os-shell-focus")} style={themeStyle(theme)}>
      <Sidebar activeView={activeView} email={email} theme={theme} onNavigate={handleNavigate} onTheme={setTheme} />
      <section className="fx-os-main">
        <TopBar
          activeView={activeView}
          selectedDate={selectedDate}
          onAdd={() => setModal(activeView === "focus" && focusTab === "trading" ? "account" : addModalFor(activeView))}
          onCalendar={() => setModal("calendar")}
          onFocusOnly={() => setFocusOnly(true)}
        />
        {loading ? <LoadingState /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => userId && void refresh(userId, selectedDate)} /> : null}
        {!loading && !error && snapshot ? (
          <>
            {activeView === "focus" ? (
              <FocusView
                accountFilter={accountFilter}
                accountDetail={accountDetail}
                focusTab={focusTab}
                pending={pending}
                planningMode={planningMode}
                selectedDate={selectedDate}
                selectedAccount={selectedAccount}
                snapshot={snapshot}
                onAccountFilter={setAccountFilter}
                onAccountBack={() => setAccountDetailId("")}
                onAccountOpen={(id) => { setSelectedAccountId(id); setAccountDetailId(id); }}
                onAccountSelect={setSelectedAccountId}
                onAccountStatus={(account, phase) => userId && run(`account:${account.id}`, () => updateAccountStatus(userId, account, phase))}
                onAddPayout={() => setModal("payout")}
                onAddTrade={() => setModal("trade")}
                onPlanningAction={(activity, action) => userId && run(`${action}:${activity.id}`, () => applyPlanningAction(userId, activity, action))}
                onPlanningMode={setPlanningMode}
                onResetAccount={(account, cost) => userId && run(`reset:${account.id}`, () => resetAccount(userId, account, cost))}
                onTabChange={(tab) => { setFocusTab(tab); setAccountDetailId(""); }}
              />
            ) : null}
            {activeView === "work" ? (
              <WorkView
                detailWorkspace={workspaceDetail}
                filter={taskFilter}
                pending={pending}
                selectedWorkspace={selectedWorkspace}
                snapshot={snapshot}
                workspaceFilter={workspaceFilter}
                onAddTask={() => setModal("workspace-task")}
                onBack={() => setWorkspaceDetailId("")}
                onFilter={setTaskFilter}
                onWorkspaceFilter={setWorkspaceFilter}
                onLogs={(task) => { setLogTarget({ item: task, type: "work" }); setModal("logs"); }}
                onOpenWorkspace={(id) => { setSelectedWorkspaceId(id); setWorkspaceDetailId(id); }}
                onSelectWorkspace={setSelectedWorkspaceId}
                onStatus={(workspace, status) => userId && run(`workspace:${workspace.id}`, () => setWorkspaceStatus(userId, workspace.id, status))}
                onTaskDelete={(task) => userId && run(`delete-task:${task.id}`, () => deleteWorkspaceTask(userId, task.id))}
                onTaskStatus={(task, status) => userId && run(`task:${task.id}`, () => updateWorkspaceTask(userId, task.id, { status }))}
              />
            ) : null}
            {activeView === "projects" ? (
              <ProjectsView
                detailProject={projectDetail}
                filter={projectFilter}
                pending={pending}
                selectedProject={selectedProject}
                snapshot={snapshot}
                onAddItem={() => setModal("project-item")}
                onBack={() => setProjectDetailId("")}
                onFilter={setProjectFilter}
                onItemDelete={(item) => userId && run(`delete-project-item:${item.id}`, () => deleteProjectItem(userId, item.id))}
                onItemLogs={(item) => { setLogTarget({ item, type: "project" }); setModal("logs"); }}
                onItemStatus={(item, status) => userId && run(`project-item:${item.id}`, () => updateProjectItem(userId, item.id, { status }))}
                onOpenProject={(id) => { setSelectedProjectId(id); setProjectDetailId(id); }}
                onProjectDelete={(project) => userId && run(`project-delete:${project.id}`, () => deleteProject(userId, project.id))}
                onProjectEdit={() => setModal("project-edit")}
                onSelectProject={setSelectedProjectId}
                onStatus={(project, status) => userId && run(`project:${project.id}`, () => setProjectStatus(userId, project.id, status))}
              />
            ) : null}
            {activeView === "private" ? (
              <PrivateView
                area={privateArea}
                filter={privateFilter}
                snapshot={snapshot}
                onArea={setPrivateArea}
                onBack={() => setPrivateArea(null)}
                onFilter={setPrivateFilter}
                onJournal={() => setModal("journal")}
                onPrivateItem={() => setModal("private-item")}
                onPrivateItemCompleted={(item) => userId && run(`private-complete:${item.id}`, () => updatePrivateItem(userId, item.id, { completed: !item.completed }))}
              />
            ) : null}
          </>
        ) : null}
      </section>
      <FxModal kind={modal} title={modalTitle(modal)} onClose={() => setModal(null)}>
        {modal === "calendar" ? <CalendarForm value={selectedDate} onSubmit={openCalendarDate} /> : null}
        {modal === "activity" && userId ? <ActivityForm pending={pending} onSubmit={(input) => run("activity", () => saveActivity(userId, input))} /> : null}
        {modal === "trade" && userId && selectedAccount ? <TradeForm account={selectedAccount} pending={pending} onSubmit={(input) => run("trade", () => addTrade(userId, input))} /> : null}
        {modal === "payout" && userId && selectedAccount ? <PayoutForm account={selectedAccount} pending={pending} onSubmit={(input) => run("payout", () => addPayout(userId, input))} /> : null}
        {modal === "account" && userId ? <AccountForm pending={pending} plans={snapshot?.propFirmPlans ?? []} onSubmit={(input) => run("account", () => addTradingAccount(userId, input))} /> : null}
        {modal === "workspace" && userId ? <NameForm label="Workspace name" pending={pending} onSubmit={(name) => run("workspace", () => saveWorkspace(userId, name))} /> : null}
        {modal === "workspace-task" && userId && selectedWorkspace ? <TaskForm pending={pending} targetLabel={selectedWorkspace.name} onSubmit={(input) => run("workspace-task", () => saveWorkspaceTask(userId, { ...input, workspaceId: selectedWorkspace.id }))} /> : null}
        {modal === "project" && userId ? <NameForm label="Project name" pending={pending} onSubmit={(title) => run("project", () => saveProject(userId, title))} /> : null}
        {modal === "project-edit" && userId && selectedProject ? <ProjectEditForm pending={pending} project={selectedProject} onSubmit={(title) => run("project-edit", () => updateProject(userId, selectedProject.id, { title }))} /> : null}
        {modal === "project-item" && userId && selectedProject ? <TaskForm pending={pending} targetLabel={selectedProject.title} onSubmit={(input) => run("project-item", () => saveProjectItem(userId, { ...input, projectId: selectedProject.id }))} /> : null}
        {modal === "private-item" && userId ? <PrivateItemForm area={privateArea} pending={pending} onSubmit={(input) => run("private-item", () => savePrivateItem(userId, input))} /> : null}
        {modal === "journal" && userId ? <JournalForm pending={pending} onSubmit={(text) => run("journal", () => saveJournalEntry(userId, text))} /> : null}
        {modal === "logs" && userId && currentLogTarget ? (
          <LogsForm
            item={currentLogTarget.item}
            pending={pending}
            onAdd={(body) => run(`logs-add:${currentLogTarget.item.id}`, () => currentLogTarget.type === "project" ? addProjectItemLog(userId, currentLogTarget.item.id, body) : addWorkspaceTaskLog(userId, currentLogTarget.item.id, body), { closeModal: false })}
            onDelete={(logId) => run(`logs-delete:${logId}`, () => currentLogTarget.type === "project" ? deleteProjectItemLog(userId, logId) : deleteWorkspaceTaskLog(userId, logId), { closeModal: false })}
            onUpdate={(logId, body) => run(`logs-update:${logId}`, () => currentLogTarget.type === "project" ? updateProjectItemLog(userId, logId, body) : updateWorkspaceTaskLog(userId, logId, body), { closeModal: false })}
          />
        ) : null}
      </FxModal>
    </main>
  );
}

function Sidebar({ activeView, email, theme, onNavigate, onTheme }: { activeView: FxOSMainView; email: string; theme: AccentTheme; onNavigate: (view: FxOSMainView) => void; onTheme: (theme: AccentTheme) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="fx-sidebar">
      <div className="fx-brand">
        <picture className="fx-brand-icon">
          <source srcSet="/brand/fp-dark.svg" type="image/svg+xml" />
          <img src="/brand/fp-dark.png" alt="Fx OS" width={44} height={44} />
        </picture>
        <div className="min-w-0">
          <p className="fx-brand-title">Fx OS</p>
          <p className="fx-brand-subtitle">Personal execution system</p>
        </div>
      </div>
      <nav className="fx-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.value;
          return (
            <button key={item.value} className={cn("fx-nav-item", active && "fx-nav-item-active")} type="button" aria-current={active ? "page" : undefined} onClick={() => onNavigate(item.value)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="fx-profile">
        <div className="fx-theme-anchor">
          <button className="fx-avatar fx-theme-button" type="button" aria-label="Change accent color" onClick={() => setOpen((value) => !value)}>
            <Palette className="h-5 w-5" aria-hidden="true" />
          </button>
          {open ? (
            <div className="fx-theme-menu">
              {accentThemes.map((item) => (
                <button key={item} className={cn("fx-theme-dot", `fx-theme-dot-${item}`, theme === item && "is-active")} type="button" aria-label={`Set ${item} theme`} onClick={() => { onTheme(item); setOpen(false); }} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">Fx</p>
          <p className="truncate text-xs text-[var(--fx-muted)]">{email}</p>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ activeView, selectedDate, onAdd, onCalendar, onFocusOnly }: { activeView: FxOSMainView; selectedDate: string; onAdd: () => void; onCalendar: () => void; onFocusOnly: () => void }) {
  const date = new Date(`${selectedDate}T00:00:00`);
  return (
    <header className="fx-topbar">
      <div>
        <h1 className="fx-page-title">{activeView.toUpperCase()}</h1>
        <p className="fx-page-subtitle">{subtitleFor(activeView)}</p>
      </div>
      <div className="fx-top-actions">
        <button className="fx-icon-pill" type="button" aria-label="Open calendar" onClick={onCalendar}>
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          <span className="hidden xl:block">
            <span className="block text-sm text-white">{formatDate(date)}</span>
            <span className="block text-xs text-[var(--fx-muted)]">{formatWeekday(date)}</span>
          </span>
        </button>
        <button className="fx-icon-pill" type="button" aria-label="Add" onClick={onAdd}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button className="fx-icon-pill" type="button" aria-label="Focus mode" onClick={onFocusOnly}>
          <Crosshair className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="fx-logout-wrap" aria-label="Logout">
          <LogOut className="pointer-events-none absolute h-5 w-5" aria-hidden="true" />
          <DashboardLogoutButton />
        </div>
      </div>
    </header>
  );
}

function FocusView(props: {
  accountFilter: (typeof accountFilters)[number];
  accountDetail: TradingAccount | null;
  focusTab: FocusTab;
  pending: string;
  planningMode: PlanningMode;
  selectedDate: string;
  selectedAccount: TradingAccount | null;
  snapshot: FxOSSnapshot;
  onAccountBack: () => void;
  onAccountFilter: (filter: (typeof accountFilters)[number]) => void;
  onAccountOpen: (id: string) => void;
  onAccountSelect: (id: string) => void;
  onAccountStatus: (account: TradingAccount, phase: TradingAccountPhase) => void;
  onAddPayout: () => void;
  onAddTrade: () => void;
  onPlanningAction: (activity: ExecutionActivity, action: "complete" | "delay" | "end-early" | "miss") => void;
  onPlanningMode: (mode: PlanningMode) => void;
  onResetAccount: (account: TradingAccount, cost: number) => void;
  onTabChange: (tab: FocusTab) => void;
}) {
  return (
    <div className="fx-view">
      <div className="fx-tabs" role="tablist" aria-label="Focus">
        <button className={cn("fx-tab", props.focusTab === "planning" && "fx-tab-active")} type="button" onClick={() => props.onTabChange("planning")}>Planning</button>
        <button className={cn("fx-tab", props.focusTab === "trading" && "fx-tab-active")} type="button" onClick={() => props.onTabChange("trading")}>Trading</button>
      </div>
      {props.focusTab === "planning" ? (
        <PlanningView {...props} />
      ) : (
        <TradingView {...props} />
      )}
    </div>
  );
}

function PlanningView({ pending, planningMode, selectedDate, snapshot, onPlanningAction, onPlanningMode }: Pick<Parameters<typeof FocusView>[0], "pending" | "planningMode" | "selectedDate" | "snapshot" | "onPlanningAction" | "onPlanningMode">) {
  return (
    <ContentGrid variant="focus">
      <FocusPrimaryPanel
        eyebrow={planningEyebrow(selectedDate)}
        controls={(
          <div className="fx-mode-switch">
            <button className={cn(planningMode === "ring" && "is-active")} type="button" aria-label="Ring view" onClick={() => onPlanningMode("ring")}><Target className="h-4 w-4" /></button>
            <button className={cn(planningMode === "day" && "is-active")} type="button" aria-label="Day list view" onClick={() => onPlanningMode("day")}><LayoutList className="h-4 w-4" /></button>
          </div>
        )}
        ring={planningMode === "ring" ? <PlanningRing activity={snapshot.currentActivity} nextActivity={snapshot.nextActivity} /> : <DayPlanningList activities={snapshot.selectedDateActivities} selectedDate={selectedDate} onAction={onPlanningAction} />}
        actions={planningMode === "ring" ? (
          <button className="fx-primary-action" disabled={!snapshot.currentActivity || pending === `complete:${snapshot.currentActivity?.id ?? ""}`} type="button" onClick={() => snapshot.currentActivity && onPlanningAction(snapshot.currentActivity, "complete")}>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Complete
          </button>
        ) : null}
        footer={planningMode === "ring" ? (
          <div className="fx-secondary-actions">
            <button type="button" disabled={!snapshot.currentActivity} onClick={() => snapshot.currentActivity && onPlanningAction(snapshot.currentActivity, "miss")}><XCircle className="h-4 w-4" />Not done</button>
            <button type="button" disabled={!snapshot.currentActivity} onClick={() => snapshot.currentActivity && onPlanningAction(snapshot.currentActivity, "end-early")}><Square className="h-4 w-4" />End early</button>
          </div>
        ) : null}
      />
      <SecondaryPanel eyebrow="NEXT">
        {snapshot.nextActivity ? <NextActivity activity={snapshot.nextActivity} /> : <EmptyFocus title="Clear" text="No upcoming activity found." />}
      </SecondaryPanel>
    </ContentGrid>
  );
}

function PlanningRing({ activity, compact = false, nextActivity }: { activity: ExecutionActivity | null; compact?: boolean; nextActivity?: ExecutionActivity | null }) {
  const now = useNowTick(1000);
  const displayActivity = activity ?? nextActivity ?? null;
  const active = Boolean(activity);
  const progress = activity ? getLiveActivityProgress(activity, now) : nextActivity ? getNextActivityCountdownProgress(nextActivity, now) : 0;
  return (
    <ProgressRing progress={progress}>
      <div className="text-center">
        <p className={cn("font-semibold text-white", compact ? "text-5xl" : "text-4xl")}>{displayActivity ? domainLabel(displayActivity.category) : "Clear"}</p>
        <p className="mt-4 text-lg text-[var(--fx-muted)]">{displayActivity ? displayActivity.title : "No upcoming activity"}</p>
        <p className="mt-5 font-mono text-xl text-white/75">{displayActivity ? `${displayActivity.startTime} - ${displayActivity.endTime}` : "--:--"}</p>
        <div className="mx-auto mt-7 h-px w-40 bg-white/10" />
        <p className="mt-6 font-mono text-5xl font-semibold text-[var(--fx-accent)]">{activity ? formatRemaining(activity, now) : nextActivity ? formatUntilStart(nextActivity, now) : "--:--:--"}</p>
        <p className="mt-2 text-sm text-[var(--fx-muted)]">{active ? "remaining" : "until next"}</p>
      </div>
    </ProgressRing>
  );
}

function DayPlanningList({ activities, onAction, selectedDate }: { activities: ExecutionActivity[]; onAction: (activity: ExecutionActivity, action: "complete" | "delay" | "end-early" | "miss") => void; selectedDate: string }) {
  if (!activities.length) return <PanelEmpty title="No activity for this day" />;
  return <DayPlanningTimeline activities={activities} selectedDate={selectedDate} onAction={onAction} />;
}

function DayPlanningTimeline({ activities, onAction, selectedDate }: { activities: ExecutionActivity[]; onAction: (activity: ExecutionActivity, action: "complete" | "delay" | "end-early" | "miss") => void; selectedDate: string }) {
  const now = useNowTick(1000);
  if (!activities.length) return <PanelEmpty title="No activity for this day" />;
  const sorted = activities.flatMap((activity) => splitActivityForTimeline(activity, selectedDate, now)).sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime));
  return (
    <div className="fx-planning-timeline">
      {sorted.map((item) => (
        <div key={item.id} className={cn("fx-timeline-block", item.temporalState === "now" && "is-active", item.temporalState === "missed" && "is-missed")}>
          <div className="fx-timeline-time">
            <span>{item.startTime}</span>
            <span>{item.endTime}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{item.activity.title}</p>
            <p className="text-sm text-[var(--fx-muted)]">{domainLabel(item.activity.category)}</p>
          </div>
          <span className={cn("fx-badge fx-state-badge", item.temporalState === "missed" && "is-missed")}>
            {item.temporalState === "missed" ? <XCircle className="h-4 w-4" aria-hidden="true" /> : null}
            {label(item.temporalState)}
          </span>
          <button className="fx-miss-button" type="button" aria-label="Mark activity as not done" onClick={() => onAction(item.activity, "miss")}><XCircle className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function TradingView({ accountDetail, accountFilter, selectedAccount, snapshot, onAccountBack, onAccountFilter, onAccountOpen, onAccountSelect, onAccountStatus, onAddPayout, onAddTrade, onResetAccount }: Parameters<typeof FocusView>[0]) {
  const now = useNowTick();
  const session = getTradingSession(now);
  const accounts = filterAccounts(snapshot.accounts, accountFilter);
  const funded = selectedAccount?.phase === "funded";
  const accountTrades = accountDetail ? snapshot.trades.filter((trade) => trade.accountId === accountDetail.id) : [];
  if (accountDetail) {
    return (
      <ContentGrid variant="single">
        <section className="fx-panel fx-panel-full">
          <Breadcrumb root="Trading" current={accountDetail.name || accountDetail.firm} onBack={onAccountBack} />
          <PanelHeader eyebrow="ACCOUNT" subtitle={`${phaseLabel(accountDetail.phase)} - ${formatMoney(accountDetail.balance)}`} title={accountDetail.name || accountDetail.firm}>
            <div className="fx-toolbar-row compact">
              <button className="fx-primary-action fx-inline-action" type="button" onClick={onAddTrade}><Plus className="h-4 w-4" />Add a trade</button>
              <button className="fx-primary-action fx-inline-action" type="button" disabled={accountDetail.phase !== "funded"} onClick={onAddPayout}><CircleDollarSign className="h-4 w-4" />Add a payout</button>
            </div>
          </PanelHeader>
          <TradeHistory trades={accountTrades} />
        </section>
      </ContentGrid>
    );
  }
  return (
    <ContentGrid variant="focus">
      <FocusPrimaryPanel
        eyebrow={session.locked ? "LOCKED" : session.state}
        ring={(
          <ProgressRing progress={session.progress}>
          <div className="text-center">
            <p className="text-4xl font-semibold text-white">Trading</p>
            <p className="mt-4 text-lg text-[var(--fx-muted)]">{formatTime(now)} - {session.name}</p>
            <div className="mx-auto mt-7 h-px w-40 bg-white/10" />
            <p className="mt-7 text-xl text-[var(--fx-accent)]">{session.label}</p>
          </div>
          </ProgressRing>
        )}
        actions={(
          <div className="fx-action-pair">
          <button className="fx-primary-action" type="button" disabled={!selectedAccount} onClick={onAddTrade}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add a trade
          </button>
          <button className="fx-primary-action" type="button" disabled={!funded} onClick={onAddPayout}>
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
            Add a payout
          </button>
          </div>
        )}
        footer={(
          <div className="fx-metrics-row">
          <Metric icon={CircleDollarSign} label="Daily P&L" value={formatMoney(snapshot.dailyPnl)} />
          <Metric icon={Target} label="Trades" value={String(snapshot.todayTrades.length)} />
          </div>
        )}
      />
      <SecondaryPanel eyebrow="ACCOUNTS">
        <div className="fx-panel-control-strip">
          <div className="fx-filter-row">
          {accountFilters.map((filter) => (
            <button key={filter} className={cn("fx-chip", accountFilter === filter && "is-active")} type="button" onClick={() => onAccountFilter(filter)}>{filterLabel(filter)}</button>
          ))}
          </div>
        </div>
        <div className="fx-account-list">
          {accounts.length ? accounts.map((account) => (
            <div key={account.id} className={cn("fx-account-row", selectedAccount?.id === account.id && "is-active")} role="button" tabIndex={0} onClick={() => onAccountSelect(account.id)} onDoubleClick={() => onAccountOpen(account.id)}>
              <div>
                <p className="font-semibold text-white">{account.name || account.firm}</p>
                <p className="text-sm text-[var(--fx-muted)]">{phaseLabel(account.phase)} · {formatMoney(account.balance)}</p>
              </div>
              <div className="fx-account-actions">
                <button type="button" onClick={(event) => { event.stopPropagation(); onAccountStatus(account, "funded"); }}>Set funded</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onAccountStatus(account, account.phase === "funded" ? "blown_funded" : "blown_eval"); }}>Set blown</button>
              </div>
              {account.phase === "blown_eval" || account.phase === "blown_funded" ? <ResetInline account={account} onReset={onResetAccount} /> : null}
            </div>
          )) : <PanelEmpty title="No account in this filter" />}
        </div>
      </SecondaryPanel>
    </ContentGrid>
  );
}

function WorkView({ detailWorkspace, filter, pending, selectedWorkspace, snapshot, workspaceFilter, onAddTask, onBack, onFilter, onLogs, onOpenWorkspace, onSelectWorkspace, onStatus, onTaskDelete, onTaskStatus, onWorkspaceFilter }: {
  detailWorkspace: Workspace | null;
  filter: WorkStatus | "all";
  pending: string;
  selectedWorkspace: Workspace | null;
  snapshot: FxOSSnapshot;
  workspaceFilter: Workspace["status"] | "all";
  onAddTask: () => void;
  onBack: () => void;
  onFilter: (filter: WorkStatus | "all") => void;
  onLogs: (task: WorkTask) => void;
  onOpenWorkspace: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
  onStatus: (workspace: Workspace, status: Workspace["status"]) => void;
  onTaskDelete: (task: WorkTask) => void;
  onTaskStatus: (task: WorkTask, status: WorkStatus) => void;
  onWorkspaceFilter: (filter: Workspace["status"] | "all") => void;
}) {
  const active = snapshot.activeWorkspace;
  const activeTasks = (active?.tasks ?? []).filter((task) => task.status === "active").sort((a, b) => a.position - b.position);
  const nextTasks = orderedNext(active?.tasks ?? []).filter((task) => task.status !== "active");
  const workspaces = snapshot.workspaces.filter((workspace) => workspaceFilter === "all" || workspace.status === workspaceFilter);
  const detailTasks = detailWorkspace?.tasks.filter((task) => filter === "all" || task.status === filter) ?? [];
  if (detailWorkspace) {
    return (
      <ContentGrid variant="single">
        <section className="fx-panel fx-panel-full">
          <Breadcrumb root="Work" current={detailWorkspace.name} onBack={onBack} />
          <PanelHeader eyebrow={detailWorkspace.name} subtitle={`${detailWorkspace.tasks.length} tasks`}>
            <div className="fx-toolbar-row compact">
              <IconStatusControls values={workspaceStatuses} value={detailWorkspace.status} onChange={(status) => onStatus(detailWorkspace, status as Workspace["status"])} />
              <FilterControls values={["all", ...workStatuses]} value={filter} onChange={(value) => onFilter(value as WorkStatus | "all")} />
              <button className="fx-icon-action" type="button" onClick={onAddTask} aria-label="Add task"><Plus className="h-4 w-4" /></button>
            </div>
          </PanelHeader>
          <ItemList>
            {detailTasks.length ? detailTasks.map((task) => (
              <TaskLine key={task.id} item={task} pending={pending} onDelete={onTaskDelete} onLogs={onLogs} onStatus={onTaskStatus} />
            )) : <PanelEmpty title="No task in this filter" />}
          </ItemList>
        </section>
      </ContentGrid>
    );
  }
  return (
    <ContentGrid>
      <section className="fx-panel">
        <PanelHeader eyebrow="TODAY" title={active?.name ?? "No active workspace"} />
        <ItemList>
          {activeTasks.length ? activeTasks.map((task) => (
            <TaskLine key={task.id} item={task} pending={pending} onDelete={onTaskDelete} onLogs={onLogs} onStatus={onTaskStatus} />
          )) : <PanelEmpty title="No next action" />}
        </ItemList>
        <div className="fx-panel-subsection">
          <p className="fx-panel-eyebrow">NEXT ACTIONS</p>
          <ItemList>
            {nextTasks.length ? nextTasks.map((task) => (
              <TaskLine key={task.id} item={task} pending={pending} onDelete={onTaskDelete} onLogs={onLogs} onStatus={onTaskStatus} />
            )) : <PanelEmpty title="No next action" />}
          </ItemList>
        </div>
      </section>
      <section className="fx-panel">
        <PanelHeader eyebrow="WORKSPACES" />
        <div className="fx-panel-control-strip">
          <IconStatusControls values={["all", ...workspaceStatuses]} value={workspaceFilter} onChange={(value) => onWorkspaceFilter(value as Workspace["status"] | "all")} />
        </div>
        <ContainerList items={workspaces} selectedId={selectedWorkspace?.id} onOpen={onOpenWorkspace} onSelect={onSelectWorkspace} showCount />
        {selectedWorkspace ? (
          <div className="fx-container-controls">
            <IconStatusControls values={workspaceStatuses} value={selectedWorkspace.status} onChange={(status) => onStatus(selectedWorkspace, status as Workspace["status"])} />
          </div>
        ) : <PanelEmpty title="Add a workspace with the plus button" />}
      </section>
    </ContentGrid>
  );
}

function ProjectsView({ detailProject, filter, pending, selectedProject, snapshot, onAddItem, onBack, onFilter, onItemDelete, onItemLogs, onItemStatus, onOpenProject, onProjectDelete, onProjectEdit, onSelectProject, onStatus }: {
  detailProject: Project | null;
  filter: Project["status"] | "all";
  pending: string;
  selectedProject: Project | null;
  snapshot: FxOSSnapshot;
  onAddItem: () => void;
  onBack: () => void;
  onFilter: (filter: Project["status"] | "all") => void;
  onItemDelete: (item: ProjectItem) => void;
  onItemLogs: (item: ProjectItem) => void;
  onItemStatus: (item: ProjectItem, status: WorkStatus) => void;
  onOpenProject: (id: string) => void;
  onProjectDelete: (project: Project) => void;
  onProjectEdit: () => void;
  onSelectProject: (id: string) => void;
  onStatus: (project: Project, status: Project["status"]) => void;
}) {
  const active = snapshot.activeProject;
  const projects = snapshot.projects.filter((project) => filter === "all" || project.status === filter);
  const activeItems = (active?.items ?? []).filter((item) => item.status === "active").sort((a, b) => a.position - b.position);
  const nextItems = orderedNext(active?.items ?? []).filter((item) => item.status !== "active");
  const detailItems = detailProject?.items.filter((item) => item.status !== "completed") ?? [];
  if (detailProject) {
    return (
      <ContentGrid variant="single">
        <section className="fx-panel fx-panel-full">
          <Breadcrumb root="Projects" current={detailProject.title} onBack={onBack} />
          <PanelHeader eyebrow={detailProject.title} subtitle={`${detailProject.items.length} mini projects`}>
            <div className="fx-toolbar-row compact">
              <IconStatusControls values={projectStatuses} value={detailProject.status} onChange={(status) => onStatus(detailProject, status as Project["status"])} />
              <button className="fx-icon-action" type="button" aria-label="Edit project" onClick={onProjectEdit}><Edit3 className="h-4 w-4" /></button>
              <button className="fx-icon-action danger" type="button" aria-label="Delete project" onClick={() => onProjectDelete(detailProject)}><Trash2 className="h-4 w-4" /></button>
              <button className="fx-icon-action" type="button" onClick={onAddItem} aria-label="Add mini project"><Plus className="h-4 w-4" /></button>
            </div>
          </PanelHeader>
          <ItemList>
            {detailItems.length ? detailItems.map((item) => (
              <ProjectItemLine key={item.id} item={item} pending={pending} onDelete={onItemDelete} onLogs={onItemLogs} onStatus={onItemStatus} />
            )) : <PanelEmpty title="No active mini project" />}
          </ItemList>
        </section>
      </ContentGrid>
    );
  }
  return (
    <ContentGrid>
      <section className="fx-panel">
        <PanelHeader eyebrow="ACTIVE" title={active?.title ?? "No active project"} />
        <ItemList>
          {activeItems.length ? activeItems.map((item) => <ProjectItemLine key={item.id} item={item} pending={pending} onDelete={onItemDelete} onLogs={onItemLogs} onStatus={onItemStatus} />) : <PanelEmpty title="No active mini project" />}
        </ItemList>
        <div className="fx-panel-subsection">
          <p className="fx-panel-eyebrow">NEXT ACTIONS</p>
          <ItemList>
            {nextItems.length ? nextItems.map((item) => <ProjectItemLine key={item.id} item={item} pending={pending} onDelete={onItemDelete} onLogs={onItemLogs} onStatus={onItemStatus} />) : <PanelEmpty title="No next action" />}
          </ItemList>
        </div>
      </section>
      <section className="fx-panel">
        <PanelHeader eyebrow="PROJECTS" />
        <div className="fx-panel-control-strip">
          <IconStatusControls values={["all", ...projectStatuses]} value={filter} onChange={(value) => onFilter(value as Project["status"] | "all")} />
        </div>
        <ContainerList items={projects} selectedId={selectedProject?.id} onOpen={onOpenProject} onSelect={onSelectProject} titleKey="title" showCount />
        {selectedProject ? (
          <div className="fx-container-controls">
            <IconStatusControls values={projectStatuses} value={selectedProject.status} onChange={(status) => onStatus(selectedProject, status as Project["status"])} />
            <button className="fx-icon-action" type="button" aria-label="Edit project" onClick={onProjectEdit}><Edit3 className="h-4 w-4" /></button>
            <button className="fx-icon-action danger" type="button" aria-label="Delete project" onClick={() => onProjectDelete(selectedProject)}><Trash2 className="h-4 w-4" /></button>
          </div>
        ) : <PanelEmpty title="Add a project with the plus button" />}
      </section>
    </ContentGrid>
  );
}

function PrivateView({ area, filter, snapshot, onArea, onBack, onFilter, onJournal, onPrivateItem, onPrivateItemCompleted }: { area: PrivateAreaId | null; filter: PrivateFilter; snapshot: FxOSSnapshot; onArea: (area: PrivateAreaId) => void; onBack: () => void; onFilter: (filter: PrivateFilter) => void; onJournal: () => void; onPrivateItem: () => void; onPrivateItemCompleted: (item: PrivateItem) => void }) {
  const recent = [...snapshot.privateItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const activeArea = area ? privateAreas.find((item) => item.id === area) : null;
  const areaItems = sortPrivateItems(snapshot.privateItems.filter((item) => item.area === area && matchesPrivateFilter(item, filter)));
  if (activeArea) {
    const Icon = activeArea.icon;
    return (
      <ContentGrid variant="single">
        <section className="fx-panel fx-panel-full">
          <Breadcrumb root="Private" current={activeArea.title} onBack={onBack} />
          <PanelHeader eyebrow={activeArea.title} icon={<div className="fx-square-icon"><Icon className="h-6 w-6" /></div>} subtitle={activeArea.subtitle} title={activeArea.title}>
            <div className="fx-toolbar-row compact">
              <FilterControls values={["all", "todo", "buy", "watch", "read", "completed"]} value={filter} onChange={(value) => onFilter(value as PrivateFilter)} />
              <button className="fx-icon-action" type="button" onClick={area === "finance" ? onJournal : onPrivateItem} aria-label={area === "finance" ? "Add journal" : "Add private item"}><Plus className="h-4 w-4" /></button>
            </div>
          </PanelHeader>
          {area === "finance" ? <JournalPreview entries={snapshot.journal} /> : null}
          <PrivateItemList items={areaItems} onCompleted={onPrivateItemCompleted} />
        </section>
      </ContentGrid>
    );
  }
  return (
    <ContentGrid>
      <section className="fx-panel">
        <PanelHeader eyebrow="ACCESS" />
        <div className="mt-8 space-y-3">
          {privateAreas.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className="fx-private-row" type="button" onClick={() => onArea(item.id)}>
                <Icon className="h-8 w-8" aria-hidden="true" />
                <span className="min-w-0 text-left">
                  <span className="block text-xl font-semibold text-white">{item.title}</span>
                  <span className="block text-sm text-[var(--fx-muted)]">{item.subtitle}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-white/45" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
      <section className="fx-panel">
        <p className="fx-panel-eyebrow">RECENT</p>
        <PrivateItemList items={recent} onCompleted={onPrivateItemCompleted} />
      </section>
    </ContentGrid>
  );
}

function PrivateItemList({ items, onCompleted }: { items: PrivateItem[]; onCompleted: (item: PrivateItem) => void }) {
  if (!items.length) return <PanelEmpty title="No item" />;
  return (
    <div className="fx-private-list">
      {items.map((item) => (
        <div key={item.id} className={cn("fx-private-item-line", item.completed && "is-completed")}>
          <button className={cn("fx-icon-action", item.completed && "is-active")} type="button" aria-label={item.completed ? "Mark private item as incomplete" : "Mark private item as completed"} onClick={() => onCompleted(item)}>
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{item.title}</p>
            <p className="truncate text-sm text-[var(--fx-muted)]">{item.deadline ? `Deadline ${item.deadline}` : item.content || formatShortDate(item.createdAt ?? "")}</p>
          </div>
          <span className="fx-badge">{privateCategoryLabel(item.category)}</span>
        </div>
      ))}
    </div>
  );
}

function TaskLine({ item, pending, onDelete, onLogs, onStatus }: { item: WorkTask; pending: string; onDelete: (task: WorkTask) => void; onLogs: (task: WorkTask) => void; onStatus: (task: WorkTask, status: WorkStatus) => void }) {
  return (
    <div className={cn("fx-task-row", item.status === "active" && "is-active")}>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-white">{item.title}</p>
        <p className="text-sm text-[var(--fx-muted)]">{item.deadline ?? "No deadline"} · {item.logs.length} logs</p>
      </div>
      <select className="fx-input fx-status-select" value={item.status} disabled={pending === `task:${item.id}`} onChange={(event) => onStatus(item, event.target.value as WorkStatus)}>
        {workStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
      </select>
      <div className="fx-row-actions">
        <button className="fx-icon-action" type="button" aria-label="Open logs" onClick={() => onLogs(item)}><MessageSquare className="h-4 w-4" /></button>
        <button className="fx-icon-action danger" type="button" aria-label="Delete task" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ProjectItemLine({ item, pending, onDelete, onLogs, onStatus }: { pending: string; item: ProjectItem; onDelete: (item: ProjectItem) => void; onLogs: (item: ProjectItem) => void; onStatus: (item: ProjectItem, status: WorkStatus) => void }) {
  return (
    <div className={cn("fx-task-row", item.status === "active" && "is-active")}>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-white">{item.title}</p>
        <p className="text-sm text-[var(--fx-muted)]">{item.deadline ?? "No deadline"} · {item.logs.length} logs</p>
      </div>
      <select className="fx-input fx-status-select" value={item.status} disabled={pending === `project-item:${item.id}`} onChange={(event) => onStatus(item, event.target.value as WorkStatus)}>
        {workStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
      </select>
      <div className="fx-row-actions">
        <button className="fx-icon-action" type="button" aria-label="Open logs" onClick={() => onLogs(item)}><MessageSquare className="h-4 w-4" /></button>
        <button className="fx-icon-action danger" type="button" aria-label="Delete mini project" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ContainerList<T extends { id: string; items?: unknown[]; name?: string; status: string; tasks?: unknown[]; title?: string }>({ items, onOpen, onSelect, selectedId, showCount = false, titleKey = "name" }: { items: T[]; onOpen?: (id: string) => void; onSelect: (id: string) => void; selectedId?: string; showCount?: boolean; titleKey?: "name" | "title" }) {
  return (
    <div className="fx-container-list">
      {items.map((item) => (
        <button key={item.id} className={cn("fx-container-row", selectedId === item.id && "is-active")} type="button" onClick={() => onSelect(item.id)} onDoubleClick={() => onOpen?.(item.id)}>
          <FolderOpen className="h-5 w-5" />
          <span className="min-w-0 flex-1 truncate text-left">{titleKey === "title" ? item.title : item.name}</span>
          {showCount ? <span className="text-xs text-[var(--fx-muted)]">{(item.items ?? item.tasks ?? []).length}</span> : null}
          <StatusDot status={item.status} />
        </button>
      ))}
    </div>
  );
}

function FxModal({ children, kind, onClose, title }: { children: ReactNode; kind: ModalKind; onClose: () => void; title: string }) {
  if (!kind) return null;
  return (
    <div className="fx-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn("fx-modal", kind === "calendar" && "fx-modal-calendar")}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xl font-semibold text-white">{title}</p>
          <button className="fx-mini-button" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function CalendarForm({ onSubmit, value }: { value: string; onSubmit: (date: string) => void }) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value));
  const days = buildCalendarDays(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
  return (
    <div className="fx-calendar-picker">
      <div className="fx-calendar-header">
        <button className="fx-icon-action" type="button" aria-label="Previous month" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}><ChevronLeft className="h-4 w-4" /></button>
        <p>{monthLabel}</p>
        <button className="fx-icon-action" type="button" aria-label="Next month" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="fx-calendar-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="fx-calendar-grid">
        {days.map((day) => (
          <button
            key={day.iso}
            className={cn("fx-calendar-day", !day.currentMonth && "is-muted", day.iso === value && "is-selected", day.iso === getTodayIsoDate() && "is-today")}
            type="button"
            onClick={() => onSubmit(day.iso)}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityForm({ onSubmit, pending }: { pending: string; onSubmit: (input: Parameters<typeof saveActivity>[1]) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LifeDomain>("work");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [frequency, setFrequency] = useState<ActivityRepeat>("never");
  const [startDate, setStartDate] = useState(getTodayIsoDate());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category, endDate: endDate || null, endTime, frequency, notes, startDate, startTime, title }); }}>
      <input className="fx-input" required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <select className="fx-input" value={category} onChange={(event) => setCategory(event.target.value as LifeDomain)}>{domains.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="fx-form-grid"><input className="fx-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /><input className="fx-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
      <select className="fx-input" value={frequency} onChange={(event) => setFrequency(event.target.value as ActivityRepeat)}>{repeats.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="fx-form-grid"><input className="fx-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><input className="fx-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
      <textarea className="fx-input" placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <button className="fx-primary-action" disabled={pending === "activity"} type="submit">Add activity</button>
    </form>
  );
}

function TradeForm({ account, onSubmit, pending }: { account: TradingAccount; pending: string; onSubmit: (input: Parameters<typeof addTrade>[1]) => void }) {
  const [symbol, setSymbol] = useState("NQ");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [result, setResult] = useState("BE");
  const [pnl, setPnl] = useState("0");
  function selectResult(value: string) {
    setResult(value);
    if (value === "BE") setPnl("0");
  }
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ accountId: account.id, direction, pnl: Number(pnl) || 0, symbol }); }}>
      <p className="text-sm text-[var(--fx-muted)]">{account.name}</p>
      <input className="fx-input" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="Instrument" />
      <Segmented values={["long", "short"]} value={direction} onChange={(value) => setDirection(value as "long" | "short")} />
      <Segmented values={["-2R", "-1R", "BE", "+1R", "+2R"]} value={result} onChange={selectResult} />
      <input className="fx-input" disabled={result === "BE"} type="number" step="0.01" value={pnl} onChange={(event) => setPnl(event.target.value)} placeholder="PnL $" />
      <button className="fx-primary-action" disabled={pending === "trade"} type="submit">Add trade</button>
    </form>
  );
}

function PayoutForm({ account, onSubmit, pending }: { account: TradingAccount; pending: string; onSubmit: (input: Parameters<typeof addPayout>[1]) => void }) {
  const [amount, setAmount] = useState("");
  return <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ accountId: account.id, amount: Number(amount) || 0, source: account.name }); }}><p className="text-sm text-[var(--fx-muted)]">{account.name}</p><input className="fx-input" required type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount $" /><button className="fx-primary-action" disabled={pending === "payout"} type="submit">Add payout</button></form>;
}

function AccountForm({ onSubmit, pending, plans }: { pending: string; plans: TradingPropFirmPlan[]; onSubmit: (input: Parameters<typeof addTradingAccount>[1]) => void }) {
  const [firm, setFirm] = useState(plans[0]?.firm ?? "");
  const firmPlans = plans.filter((plan) => !firm || plan.firm === firm);
  const [planId, setPlanId] = useState(firmPlans[0]?.id ?? plans[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? firmPlans[0] ?? plans[0] ?? null;
  const firms = Array.from(new Set(plans.map((plan) => plan.firm))).filter(Boolean);
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); if (selectedPlan) onSubmit({ planId: selectedPlan.id, quantity: Number(quantity) || 1 }); }}>
      {!plans.length ? <p className="text-sm text-[var(--fx-muted)]">No prop firm plan found in Supabase.</p> : null}
      <select className="fx-input" value={firm} onChange={(event) => { const nextFirm = event.target.value; const nextPlan = plans.find((plan) => plan.firm === nextFirm); setFirm(nextFirm); setPlanId(nextPlan?.id ?? ""); }}>
        {firms.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="fx-input" value={planId} onChange={(event) => setPlanId(event.target.value)}>
        {firmPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
      </select>
      {selectedPlan ? (
        <div className="fx-plan-summary">
          <span>{selectedPlan.planType}</span>
          <span>{formatMoney(selectedPlan.accountSize)}</span>
          <span>{formatMoney(selectedPlan.price)}</span>
        </div>
      ) : null}
      <input className="fx-input" type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" />
      <button className="fx-primary-action" disabled={pending === "account" || !selectedPlan} type="submit">Add account</button>
    </form>
  );
}

function TaskForm({ onSubmit, pending, targetLabel }: { pending: string; targetLabel: string; onSubmit: (input: { deadline: string | null; notes: string; status: WorkStatus; title: string }) => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<WorkStatus>("todo");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ deadline: deadline || null, notes, status, title }); }}>
      <p className="text-sm text-[var(--fx-muted)]">{targetLabel}</p>
      <input className="fx-input" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
      <select className="fx-input" value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}>{workStatuses.map((item) => <option key={item}>{item}</option>)}</select>
      <input className="fx-input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      <textarea className="fx-input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
      <button className="fx-primary-action" disabled={Boolean(pending)} type="submit">Add</button>
    </form>
  );
}

function NameForm({ label, onSubmit, pending }: { label: string; pending: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit(value); }}><input className="fx-input" required placeholder={label} value={value} onChange={(event) => setValue(event.target.value)} /><button className="fx-primary-action" disabled={Boolean(pending)} type="submit">Create</button></form>;
}

function PrivateItemForm({ area, onSubmit, pending }: { area: PrivateAreaId | null; pending: string; onSubmit: (input: Parameters<typeof savePrivateItem>[1]) => void }) {
  const [targetArea, setTargetArea] = useState<PrivateAreaId>(area ?? "documents");
  const [category, setCategory] = useState<PrivateCategory>("todo");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState("");
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ area: targetArea, category, content, deadline: deadline || null, title }); }}>
      <select className="fx-input" value={targetArea} onChange={(event) => setTargetArea(event.target.value as PrivateAreaId)}>
        {privateAreas.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <select className="fx-input" value={category} onChange={(event) => setCategory(event.target.value as PrivateCategory)}>{["todo", "buy", "watch", "read"].map((item) => <option key={item} value={item}>{privateCategoryLabel(item as PrivateCategory)}</option>)}</select>
      <input className="fx-input" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
      <input className="fx-input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      <textarea className="fx-input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Notes" />
      <button className="fx-primary-action" disabled={pending === "private-item"} type="submit">Add item</button>
    </form>
  );
}

function JournalForm({ onSubmit, pending }: { pending: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit(text); }}><textarea className="fx-input min-h-40" required value={text} onChange={(event) => setText(event.target.value)} placeholder="Journal" /><button className="fx-primary-action" disabled={pending === "journal"} type="submit">Save journal</button></form>;
}

function Segmented({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return <div className="fx-segmented">{values.map((item) => <button key={item} className={cn(value === item && "is-active")} type="button" onClick={() => onChange(item)}>{item}</button>)}</div>;
}

function ResetInline({ account, onReset }: { account: TradingAccount; onReset: (account: TradingAccount, cost: number) => void }) {
  const [cost, setCost] = useState("");
  return <div className="fx-reset-inline"><input className="fx-input" type="number" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Reset cost" /><button className="fx-mini-button" type="button" onClick={() => onReset(account, Number(cost) || 0)}>Reset</button></div>;
}

function ContentGrid({ children, variant = "split" }: { children: ReactNode; variant?: "focus" | "single" | "split" }) {
  return <div className={cn("fx-content-grid", variant === "focus" && "fx-content-grid-focus", variant === "single" && "fx-content-grid-single")}>{children}</div>;
}

function PanelHeader({ children, eyebrow, icon, subtitle, title }: { children?: ReactNode; eyebrow: string; icon?: ReactNode; subtitle?: string; title?: string }) {
  return (
    <div className="fx-panel-heading">
      <div className="fx-panel-title-row">
        {icon}
        <div className="min-w-0">
          <p className="fx-panel-eyebrow">{eyebrow}</p>
          {title ? <p className="fx-panel-title">{title}</p> : null}
          {subtitle ? <p className="fx-panel-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Breadcrumb({ current, onBack, root }: { current: string; onBack: () => void; root: string }) {
  return (
    <div className="fx-breadcrumb">
      <button type="button" onClick={onBack}>{root}</button>
      <ChevronRight className="h-4 w-4" />
      <span>{current}</span>
    </div>
  );
}

function ItemList({ children }: { children: ReactNode }) {
  return <div className="fx-compact-list">{children}</div>;
}

function PrimaryPanel({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return <section className="fx-panel fx-primary-panel"><p className="fx-panel-eyebrow">{eyebrow}</p>{children}</section>;
}

function FocusPrimaryPanel({ actions, controls, eyebrow, footer, ring }: { actions?: ReactNode; controls?: ReactNode; eyebrow: string; footer?: ReactNode; ring: ReactNode }) {
  return (
    <section className={cn("fx-panel fx-primary-panel fx-focus-primary-panel", !actions && !footer && "fx-focus-primary-panel-expanded")}>
      <div className="fx-focus-panel-header">
        <p className="fx-panel-eyebrow">{eyebrow}</p>
        <div className="fx-focus-panel-controls">{controls}</div>
      </div>
      <div className="fx-focus-ring-slot">{ring}</div>
      <div className="fx-focus-actions-slot">{actions}</div>
      <div className="fx-focus-footer-slot">{footer}</div>
    </section>
  );
}

function SecondaryPanel({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return <section className="fx-panel fx-secondary-panel"><p className="fx-panel-eyebrow">{eyebrow}</p>{children}</section>;
}

function ProgressRing({ children, progress }: { children: ReactNode; progress: number }) {
  const radius = 190;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="fx-ring-wrap">
      <svg className="fx-ring" viewBox="0 0 420 420" aria-hidden="true">
        <circle cx="210" cy="210" r={radius} className="fx-ring-track" />
        <circle cx="210" cy="210" r={radius} className="fx-ring-progress" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="fx-ring-content">{children}</div>
    </div>
  );
}

function NextActivity({ activity }: { activity: ExecutionActivity }) {
  return <div className="fx-next-centered"><div className="fx-large-icon"><Folder className="h-10 w-10" /></div><p className="mt-7 text-4xl font-semibold text-white">{activity.title}</p><p className="mt-5 font-mono text-xl text-white/65">{activity.startTime} - {activity.endTime}</p><p className="mt-4 text-lg text-[var(--fx-muted)]">{domainLabel(activity.category)}</p></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return <div className="fx-metric"><Icon className="h-7 w-7" /><span><span className="block text-sm text-[var(--fx-muted)]">{label}</span><span className="block font-mono text-lg text-white">{value}</span></span></div>;
}

function TradeHistory({ trades }: { trades: TradingTrade[] }) {
  if (!trades.length) return <PanelEmpty title="No trade history" />;
  return (
    <div className="fx-trade-history">
      {trades.map((trade) => (
        <div key={trade.id} className="fx-trade-row">
          <div className="min-w-0">
            <p className="font-semibold text-white">{trade.symbol}</p>
            <p className="text-sm text-[var(--fx-muted)]">{formatShortDate(trade.date)} - {label(trade.direction)}</p>
          </div>
          <span className={cn("fx-badge", trade.pnl < 0 && "is-negative", trade.pnl > 0 && "is-positive")}>{formatMoney(trade.pnl)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyFocus({ text, title }: { text: string; title: string }) {
  return <div className="grid min-h-[360px] place-items-center text-center"><div><p className="text-4xl font-semibold text-white">{title}</p><p className="mt-3 text-[var(--fx-muted)]">{text}</p></div></div>;
}

function PanelEmpty({ title }: { title: string }) {
  return <p className="py-8 text-center text-[var(--fx-muted)]">{title}</p>;
}

function LoadingState() {
  return <ContentGrid><div className="fx-skeleton" /><div className="fx-skeleton" /></ContentGrid>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="fx-panel mx-auto mt-20 max-w-xl text-center"><p className="text-xl font-semibold text-white">Unable to load</p><p className="mt-3 text-[var(--fx-muted)]">{message}</p><button className="fx-primary-action mt-8" type="button" onClick={onRetry}><RefreshCw className="h-5 w-5" />Retry</button></div>;
}

function FilterControls({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return <div className="fx-filter-row">{values.map((item) => <button key={item} className={cn("fx-chip", value === item && "is-active")} type="button" onClick={() => onChange(item)}>{label(item)}</button>)}</div>;
}

function IconStatusControls({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return (
    <div className="fx-icon-filter-row">
      {values.map((item) => {
        const Icon = statusIcons[item] ?? Pause;
        return (
          <button key={item} className={cn("fx-icon-action", value === item && "is-active")} type="button" aria-label={label(item)} onClick={() => onChange(item)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item === "active" ? <span className="fx-active-dot" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const Icon = statusIcons[status] ?? Pause;
  return <span className={cn("fx-status-dot", status === "active" && "is-active")} title={label(status)}><Icon className="h-3.5 w-3.5" /></span>;
}

function JournalPreview({ entries }: { entries: Array<{ id: string; text: string; createdAt: string }> }) {
  return <div className="mt-8 space-y-3">{entries.slice(0, 4).map((entry) => <div key={entry.id} className="fx-doc-item"><p>{formatShortDate(entry.createdAt)}</p><span>{entry.text}</span></div>)}</div>;
}

function LogsForm({ item, onAdd, onDelete, onUpdate, pending }: { item: ProjectItem | WorkTask; pending: string; onAdd: (body: string) => void; onDelete: (logId: string) => void; onUpdate: (logId: string, body: string) => void }) {
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  return (
    <div className="fx-form">
      <p className="text-sm text-[var(--fx-muted)]">{item.title}</p>
      <div className="fx-log-create">
        <input className="fx-input" value={body} placeholder="New log" onChange={(event) => setBody(event.target.value)} />
        <button className="fx-icon-action" type="button" disabled={!body.trim() || Boolean(pending)} onClick={() => { onAdd(body.trim()); setBody(""); }} aria-label="Add log"><Plus className="h-4 w-4" /></button>
      </div>
      <div className="fx-compact-list">
        {item.logs.length ? item.logs.map((log) => (
          <div key={log.id} className="fx-log-row">
            <input className="fx-input" value={editing[log.id] ?? log.body} onChange={(event) => setEditing((current) => ({ ...current, [log.id]: event.target.value }))} />
            <span className="text-xs text-[var(--fx-muted)]">{formatShortDate(log.createdAt)}</span>
            <button className="fx-icon-action" type="button" aria-label="Save log" onClick={() => onUpdate(log.id, editing[log.id] ?? log.body)}><CheckCircle2 className="h-4 w-4" /></button>
            <button className="fx-icon-action danger" type="button" aria-label="Delete log" onClick={() => onDelete(log.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        )) : <PanelEmpty title="No log yet" />}
      </div>
    </div>
  );
}

function ProjectEditForm({ onSubmit, pending, project }: { pending: string; project: Project; onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState(project.title);
  return (
    <form className="fx-form" onSubmit={(event) => { event.preventDefault(); onSubmit(title.trim()); }}>
      <input className="fx-input" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <button className="fx-primary-action" disabled={pending === "project-edit"} type="submit">Save project</button>
    </form>
  );
}

function addModalFor(view: FxOSMainView): ModalKind {
  if (view === "focus") return "activity";
  if (view === "work") return "workspace";
  if (view === "projects") return "project";
  return "private-item";
}

function modalTitle(kind: ModalKind) {
  return ({
    account: "Add account",
    activity: "Add activity",
    calendar: "Open day",
    journal: "Journal",
    logs: "Logs",
    payout: "Add payout",
    "private-item": "Add item",
    project: "Add project",
    "project-edit": "Edit project",
    "project-item": "Add mini project",
    trade: "Add trade",
    workspace: "Add workspace",
    "workspace-task": "Add task",
  } as Record<Exclude<ModalKind, null>, string>)[kind ?? "activity"] ?? "";
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message);
  return "Action failed.";
}

function resolveLogTarget(snapshot: FxOSSnapshot, target: { item: ProjectItem | WorkTask; type: "project" | "work" }) {
  if (target.type === "project") {
    const item = snapshot.projects.flatMap((project) => project.items).find((projectItem) => projectItem.id === target.item.id);
    return item ? { item, type: "project" as const } : null;
  }

  const item = snapshot.workspaces.flatMap((workspace) => workspace.tasks).find((task) => task.id === target.item.id);
  return item ? { item, type: "work" as const } : null;
}

function orderedNext<T extends { position: number; status: WorkStatus }>(items: T[]) {
  return [...items].filter((item) => item.status !== "completed" && item.status !== "later").sort((a, b) => a.position - b.position).slice(0, 6);
}

function filterAccounts(accounts: TradingAccount[], filter: (typeof accountFilters)[number]) {
  if (filter === "all") return accounts;
  if (filter === "active") return accounts.filter((account) => !account.phase.startsWith("blown"));
  if (filter === "eval") return accounts.filter((account) => account.phase === "evaluation");
  if (filter === "blown") return accounts.filter((account) => account.phase.startsWith("blown"));
  return accounts.filter((account) => account.phase === filter);
}

function getTradingSession(date: Date) {
  const minutes = getParisMinutes(date);
  if (minutes >= 930 && minutes < 1080) return { label: "Ready to trade", locked: false, name: "NY session", progress: (minutes - 930) / 150, state: "READY" };
  if (minutes >= 1080 && minutes < 1110) return { label: "Review window", locked: false, name: "Review", progress: 1, state: "COMPLETED" };
  if (minutes >= 480 && minutes < 930) return { label: "Pre-market discipline", locked: false, name: "London / pre NY", progress: 0.15, state: "READY" };
  return { label: "Market closed", locked: true, name: "No active session", progress: 1, state: "LOCKED" };
}

function planningEyebrow(selectedDate: string) {
  return selectedDate === getTodayIsoDate() ? "TODAY" : formatDate(new Date(`${selectedDate}T00:00:00`));
}

function startOfMonth(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      currentMonth: date.getMonth() === month.getMonth(),
      date,
      iso: toLocalIsoDate(date),
    };
  });
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtitleFor(view: FxOSMainView) {
  return { focus: "Only what matters now.", private: "Personal space, kept simple.", projects: "Build without scattering.", work: "Your operational space." }[view];
}

function sortPrivateItems<T extends { createdAt: string; deadline: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    if ("completed" in left && "completed" in right && left.completed !== right.completed) return left.completed ? 1 : -1;
    if (left.deadline && right.deadline) return left.deadline.localeCompare(right.deadline);
    if (left.deadline) return -1;
    if (right.deadline) return 1;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

function matchesPrivateFilter(item: PrivateItem, filter: PrivateFilter) {
  if (filter === "all") return true;
  if (filter === "completed") return item.completed;
  return item.category === filter;
}

function themeStyle(theme: AccentTheme): CSSProperties {
  const themes: Record<AccentTheme, CSSProperties> = {
    gold: {
      "--fx-accent": "#F5B967",
      "--fx-accent-rgb": "245, 185, 103",
      "--fx-accent-glow": "rgba(245, 185, 103, 0.32)",
      "--fx-accent-soft": "rgba(245, 185, 103, 0.08)",
      "--fx-border": "rgba(245, 185, 103, 0.18)",
      "--fx-border-strong": "rgba(245, 185, 103, 0.58)",
      "--fx-surface": "rgba(28, 27, 24, 0.68)",
    } as CSSProperties,
    blue: {
      "--fx-accent": "#5EA8FF",
      "--fx-accent-rgb": "94, 168, 255",
      "--fx-accent-glow": "rgba(94, 168, 255, 0.3)",
      "--fx-accent-soft": "rgba(94, 168, 255, 0.08)",
      "--fx-border": "rgba(94, 168, 255, 0.17)",
      "--fx-border-strong": "rgba(94, 168, 255, 0.54)",
      "--fx-surface": "rgba(13, 24, 36, 0.68)",
    } as CSSProperties,
    emerald: {
      "--fx-accent": "#6EF6A4",
      "--fx-accent-rgb": "110, 246, 164",
      "--fx-accent-glow": "rgba(110, 246, 164, 0.28)",
      "--fx-accent-soft": "rgba(110, 246, 164, 0.08)",
      "--fx-border": "rgba(110, 246, 164, 0.16)",
      "--fx-border-strong": "rgba(110, 246, 164, 0.52)",
      "--fx-surface": "rgba(13, 31, 24, 0.68)",
    } as CSSProperties,
    rose: {
      "--fx-accent": "#FF7AA8",
      "--fx-accent-rgb": "255, 122, 168",
      "--fx-accent-glow": "rgba(255, 122, 168, 0.28)",
      "--fx-accent-soft": "rgba(255, 122, 168, 0.08)",
      "--fx-border": "rgba(255, 122, 168, 0.17)",
      "--fx-border-strong": "rgba(255, 122, 168, 0.54)",
      "--fx-surface": "rgba(34, 16, 26, 0.68)",
    } as CSSProperties,
    teal: {
      "--fx-accent": "#20E0D0",
      "--fx-accent-rgb": "32, 224, 208",
      "--fx-accent-glow": "rgba(32, 224, 208, 0.32)",
      "--fx-accent-soft": "rgba(32, 224, 208, 0.08)",
      "--fx-border": "rgba(80, 220, 205, 0.15)",
      "--fx-border-strong": "rgba(45, 212, 191, 0.52)",
      "--fx-surface": "rgba(15, 30, 31, 0.65)",
    } as CSSProperties,
    violet: {
      "--fx-accent": "#A970FF",
      "--fx-accent-rgb": "169, 112, 255",
      "--fx-accent-glow": "rgba(169, 112, 255, 0.32)",
      "--fx-accent-soft": "rgba(169, 112, 255, 0.08)",
      "--fx-border": "rgba(169, 112, 255, 0.18)",
      "--fx-border-strong": "rgba(169, 112, 255, 0.58)",
      "--fx-surface": "rgba(22, 14, 33, 0.68)",
    } as CSSProperties,
    white: {
      "--fx-accent": "#F4F7F7",
      "--fx-accent-rgb": "244, 247, 247",
      "--fx-accent-glow": "rgba(244, 247, 247, 0.22)",
      "--fx-accent-soft": "rgba(244, 247, 247, 0.07)",
      "--fx-border": "rgba(244, 247, 247, 0.15)",
      "--fx-border-strong": "rgba(244, 247, 247, 0.44)",
      "--fx-surface": "rgba(24, 28, 28, 0.68)",
    } as CSSProperties,
  };
  return themes[theme];
}

function useNowTick(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}

function formatRemaining(activity: ExecutionActivity, now = new Date()) {
  const start = toSeconds(activity.startTime);
  const end = toSeconds(activity.endTime);
  const current = getParisSeconds(now);
  const adjustedEnd = end <= start ? end + 86400 : end;
  const adjustedCurrent = adjustedEnd > 86400 && current < end ? current + 86400 : current;
  const remaining = Math.max(0, adjustedEnd - adjustedCurrent);
  return formatClockSeconds(remaining);
}

function formatUntilStart(activity: ExecutionActivity, now = new Date()) {
  const start = toSeconds(activity.startTime);
  const current = getParisSeconds(now);
  const nextStart = start >= current ? start : start + 86400;
  return formatClockSeconds(Math.max(0, nextStart - current));
}

function getLiveActivityProgress(activity: ExecutionActivity, now = new Date()) {
  const start = toSeconds(activity.startTime);
  let end = toSeconds(activity.endTime);
  let current = getParisSeconds(now);
  if (end <= start) {
    end += 86400;
    if (current < toSeconds(activity.endTime)) current += 86400;
  }
  return Math.max(0, Math.min(1, (current - start) / Math.max(1, end - start)));
}

function getNextActivityCountdownProgress(activity: ExecutionActivity, now = new Date()) {
  const start = toSeconds(activity.startTime);
  const current = getParisSeconds(now);
  if (start >= current) {
    return Math.max(0, Math.min(1, current / Math.max(1, start)));
  }
  return Math.max(0, Math.min(1, current / 86400));
}

type TimelineActivity = {
  activity: ExecutionActivity;
  endTime: string;
  id: string;
  startTime: string;
  temporalState: ActivityTemporalState;
};

function splitActivityForTimeline(activity: ExecutionActivity, selectedDate: string, now: Date): TimelineActivity[] {
  const start = toMinutes(activity.startTime);
  const end = toMinutes(activity.endTime);
  const segments =
    end > start
      ? [{ endTime: activity.endTime, id: "main", startTime: activity.startTime }]
      : [
          end > 0 ? { endTime: activity.endTime, id: "morning", startTime: "00:00" } : null,
          start < 1440 ? { endTime: "24:00", id: "evening", startTime: activity.startTime } : null,
        ].filter((segment): segment is { endTime: string; id: string; startTime: string } => Boolean(segment));

  return segments.map((segment) => ({
    activity,
    endTime: segment.endTime,
    id: `${activity.id}:${segment.id}`,
    startTime: segment.startTime,
    temporalState: getTimelineTemporalState(activity, segment.startTime, segment.endTime, selectedDate, now),
  }));
}

function getTimelineTemporalState(activity: ExecutionActivity, startTime: string, endTime: string, selectedDate: string, now: Date): ActivityTemporalState {
  const today = getTodayIsoDate();
  if (activity.status === "missed" || activity.temporalState === "missed") return "missed";
  if (activity.status === "completed" || activity.finishedAt || selectedDate < today) return "done";
  if (selectedDate > today) return "upcoming";
  const current = getParisMinutes(now);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (current >= end) return "done";
  if (current >= start) return "now";
  return "upcoming";
}

function formatClockSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatShortDate(value: string) {
  const iso = value.slice(0, 10);
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

function getParisMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "Europe/Paris" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
}

function getParisSeconds(date: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, minute: "2-digit", second: "2-digit", timeZone: "Europe/Paris" }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minutes = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const seconds = Number(parts.find((part) => part.type === "second")?.value ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function toSeconds(value: string) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
}

function domainLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function filterLabel(value: string) {
  return value === "eval" ? "Eval" : label(value);
}

function phaseLabel(value: TradingAccountPhase) {
  return label(value.replace("blown_", "blown "));
}

function privateCategoryLabel(value: PrivateCategory) {
  return ({ buy: "To buy", journal: "Journal", read: "To read", todo: "To do", watch: "To watch" })[value];
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
