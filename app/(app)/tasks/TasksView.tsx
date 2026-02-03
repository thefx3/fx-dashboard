"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, Ban, CheckCircle, Clock, List, Sun, type LucideIcon } from "lucide-react";
import { addTask, deleteTask, setTaskStatus, updateTask } from "./action";
import { TaskDoneCheckbox } from "./TaskDoneCheckbox";
import {
  FILTER_LABELS,
  FILTER_ORDER,
  STATUS_ORDER,
  TASK_STATUS_OPTIONS,
  TaskFilter,
  TaskRow,
  ViewMode,
  WEEKDAYS,
  statusLabel,
} from "./utils";

const CALENDAR_BADGE_CLASS =
  "cursor-pointer flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm";
const INPUT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0";
const INPUT_SMALL_CLASS =
  "text-sm h-8 rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0";
const INPUT_SMALL_CLASS_PAD =
  "text-sm h-8 rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0";
const PRIMARY_BUTTON_CLASS =
  "text-sm cursor-pointer h-8 rounded-md bg-primary px-3 text-primary-foreground";
const FILTER_BUTTON_BASE = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left";
const FILTER_BUTTON_ACTIVE = "bg-foreground text-accent shadow-md";
const FILTER_BUTTON_INACTIVE = "hover:bg-primary/20";
const FILTER_COUNT_BADGE_CLASS =
  "ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground";
const STATUS_BADGE_CLASS =
  "text-xs rounded-md border border-border px-2 py-1 text-muted-foreground";
const CARD_CLASS = "w-full grid grid-cols-3 items-center gap-3 rounded-xl border border-border bg-card p-2";
const TAG_CLASS = "text-xs rounded-md bg-muted px-2 py-1";
const ACTION_BUTTON_CLASS =
  "h-8 text-sm rounded-md border border-border bg-background px-3 hover:bg-muted";
const ACTION_BUTTON_ACCENT_CLASS =
  "h-8 text-sm rounded-md border border-border bg-accent/70 px-3 hover:bg-accent/90";
const ACTION_BUTTON_DESTRUCTIVE_CLASS =
  "h-8 text-sm rounded-md bg-destructive/80 px-3 text-destructive-foreground hover:bg-destructive/90";
const CALENDAR_NAV_BUTTON_CLASS =
  "cursor-pointer rounded-md border border-border px-2 py-1 text-md hover:bg-muted";
const CALENDAR_DAY_BUTTON_CLASS =
  "rounded-full border border-border px-2 py-0.5 text-xs font-medium hover:bg-accent/20";
const MODAL_INPUT_CLASS = "h-9 rounded-md border border-input bg-background px-3";
const MODAL_SELECT_CLASS = "h-9 rounded-md border border-input bg-background px-2";
const MODAL_TEXTAREA_CLASS =
  "min-h-20 rounded-md border border-input bg-background px-3 py-2";
const MODAL_CANCEL_BUTTON_CLASS = "h-9 rounded-md border border-border px-4 hover:bg-muted";
const MODAL_PRIMARY_BUTTON_CLASS =
  "h-9 rounded-md bg-primary px-4 text-primary-foreground";

const FILTER_ICONS: Record<TaskFilter, LucideIcon> = {
  all: List,
  today: Sun,
  doing: Activity,
  done: CheckCircle,
  upcoming: Clock,
  unfinished: Ban,
};

const VIEW_TOGGLE_BASE_CLASS = "cursor-pointer h-8 px-3 rounded-md";
const VIEW_TOGGLE_ACTIVE_CLASS = "font-bold btn-tab--active bg-accent/20 shadow-md";
const VIEW_TOGGLE_INACTIVE_CLASS = "hover:bg-primary/20";

//MAIN COMPONENT
export function TasksView({ tasks }: { tasks: TaskRow[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<TaskFilter>("today");
  const filteredTasks = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const showStatus = filter === "all";
  const filterCounts = useMemo(() => getFilterCounts(tasks), [tasks]);

  return (
    <div className="space-y-6 w-full flex flex-col">
      <header className="flex items-center gap-4">
        <h1 className="text-xl uppercase tracking-widest font-semibold leading-none">Mes tâches</h1>
        <div className="inline-flex h-10 items-center rounded-md border border-border bg-card p-1 text-sm gap-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={
              viewMode === "list"
                ? `${VIEW_TOGGLE_BASE_CLASS} ${VIEW_TOGGLE_ACTIVE_CLASS}`
                : `${VIEW_TOGGLE_BASE_CLASS} ${VIEW_TOGGLE_INACTIVE_CLASS}`
            }
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={
              viewMode === "calendar"
                ? `${VIEW_TOGGLE_BASE_CLASS} ${VIEW_TOGGLE_ACTIVE_CLASS}`
                : `${VIEW_TOGGLE_BASE_CLASS} ${VIEW_TOGGLE_INACTIVE_CLASS}`
            }
          >
            Calendrier
          </button>
        </div>
      </header>


      <div className="flex flex-1 w-full">
        {viewMode === "list" ? (
          <div className="flex w-full gap-6">
            <TaskFilterNav activeFilter={filter} onChange={setFilter} counts={filterCounts} />
          
            <div className="space-y-4 w-full">
              <AddTaskForm />
              <TaskList tasks={filteredTasks} showStatus={showStatus} />
            </div>
          </div>
        ) : (
          <CalendarView tasks={tasks} />
        )}
      </div>

    </div>
  );
}

function AddTaskForm() {
  return (
    <form action={addTask} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex w-full gap-2 justify-center items-center">
        <input name="title" required className={INPUT_CLASS} placeholder="Nouvelle tâche…" />
      </div>
      <div className="flex w-full gap-2 justify-start items-center">
        <div className="flex gap-2 justify-center items-center">
          <input name="due_date" type="date" className={INPUT_SMALL_CLASS} />
        </div>

        <div className="flex gap-2 justify-center items-center">
          <label className="text-sm font-medium">Catégorie</label>
          <input
            name="category"
            className={INPUT_SMALL_CLASS_PAD}
            placeholder="Ex: dev, sport, admin…"
          />
        </div>

        <button className={PRIMARY_BUTTON_CLASS}>Ajouter</button>
      </div>
    </form>
  );
}

function TaskFilterNav({
  activeFilter,
  onChange,
  counts,
}: {
  activeFilter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  counts: Record<TaskFilter, number>;
}) {
  return (
    <aside className="w-48 shrink-0 border-r border-border">
      <nav className="flex flex-col gap-1 text-sm">
        {FILTER_ORDER.map((filterKey) => {
          const Icon = FILTER_ICONS[filterKey];
          const isActive = filterKey === activeFilter;
          return (
            <button
              key={filterKey}
              type="button"
              onClick={() => onChange(filterKey)}
              className={
                isActive
                  ? `${FILTER_BUTTON_BASE} ${FILTER_BUTTON_ACTIVE}`
                  : `${FILTER_BUTTON_BASE} ${FILTER_BUTTON_INACTIVE}`
              }
            >
              <Icon
                className={isActive ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"}
                aria-hidden="true"
              />
              <span>{FILTER_LABELS[filterKey]}</span>
              <span className={FILTER_COUNT_BADGE_CLASS}>{counts[filterKey]}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TaskList({ tasks, showStatus }: { tasks: TaskRow[]; showStatus?: boolean }) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">Aucune tâche pour le moment.</p>;
  }

  return (
    <div className="flex-1 space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} showStatus={showStatus} />
      ))}
    </div>
  );
}

function TaskCard({ task, showStatus }: { task: TaskRow; showStatus?: boolean }) {
  const abandonAction = setTaskStatus.bind(null, task.id, "unfinished");
  const doingAction = setTaskStatus.bind(null, task.id, "doing");
  const deleteAction = deleteTask.bind(null, task.id);

  return (
    <div className={CARD_CLASS}>
      <div className="flex gap-2 items-center">
        <TaskDoneCheckbox taskId={task.id} status={task.status} />
        <p className="font-medium truncate">{task.title}</p>
        {showStatus && <span className={STATUS_BADGE_CLASS}>{statusLabel(task.status)}</span>}
      </div>

      <div className="flex justify-end items-center gap-2">
        {task.category && <span className={TAG_CLASS}>{task.category}</span>}
        {task.due_date && (
          <span className="text-xs text-muted-foreground">Limite: {task.due_date}</span>
        )}
      </div>

      <div className="flex flex-1 gap-2 justify-end items-center">
        <form action={abandonAction}>
          <button className={ACTION_BUTTON_CLASS}>Abandonner</button>
        </form>

        <form action={doingAction}>
          <button className={ACTION_BUTTON_ACCENT_CLASS}>En cours</button>
        </form>

        <form action={deleteAction}>
          <button className={ACTION_BUTTON_DESTRUCTIVE_CLASS}>Supprimer</button>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: TaskRow[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const year = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  const resetSelection = () => {
    setSelectedDate(null);
    setSelectedTask(null);
  };

  const monthLabel = formatMonthLabel(calendarDate, true);
  const monthOnlyLabel = formatMonthLabel(calendarDate, false);

  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const todayKey = toISODate(today);
  const calendarCells = buildCalendarCells(year, monthIndex);

  return (
    <div className="w-full rounded-t-xl border border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetSelection();
              setCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
            className={CALENDAR_BADGE_CLASS}
            aria-label="Revenir au mois courant"
          >
            <span className="text-[10px] font-semibold uppercase">
              {today.toLocaleDateString("fr-FR", { month: "short" })}
            </span>
            <span className="text-base font-bold leading-none">{today.getDate()}</span>
          </button>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-lg font-medium capitalize text-accent">
          <button
            type="button"
            onClick={() => {
              resetSelection();
              setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
            }}
            className={CALENDAR_NAV_BUTTON_CLASS}
            aria-label="Mois précédent"
          >
            {"<"}
          </button>
          <span className="text-md text-foreground font-bold">{monthOnlyLabel}</span>
          <button
            type="button"
            onClick={() => {
              resetSelection();
              setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
            }}
            className={CALENDAR_NAV_BUTTON_CLASS}
            aria-label="Mois suivant"
          >
            {">"}
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 text-xs uppercase text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center border border-border bg-muted/40 px-2 py-1 font-medium">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 ">
        {calendarCells.map((cell) => {
          const dateKey = toISODate(cell.date);
          const dayTasks = tasksByDate.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;

          return (
            <div
              key={dateKey}
              className={
                isToday
                  ? "min-h-28 border border-primary bg-primary/5 p-2"
                  : cell.inCurrentMonth
                  ? "min-h-28 border border-border bg-card p-2"
                  : "min-h-28 border border-border bg-muted/20 p-2 text-muted-foreground"
              }
            >
              <button type="button" onClick={() => setSelectedDate(dateKey)} className={CALENDAR_DAY_BUTTON_CLASS}>
                {cell.day}
              </button>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 2).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedTask(task);
                    }}
                    className={
                      task.status === "done"
                        ? "cursor-pointer border border-border hover:scale-102 transition-500 p-1 w-full truncate text-left text-xs text-muted-foreground line-through"
                        : "cursor-pointer border border-border hover:scale-102 transition-500 rounded-md p-1 block w-full truncate text-left text-xs"
                    }
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayTasks.length - 2} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <Modal title={`${formatDate(selectedDate)}`} onClose={() => setSelectedDate(null)}>
          <DayTasksList
            tasks={tasksByDate.get(selectedDate) ?? []}
            onSelectTask={(task) => {
              setSelectedDate(null);
              setSelectedTask(task);
            }}
          />
        </Modal>
      )}

      {selectedTask && <TaskEditModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

function buildCalendarCells(year: number, monthIndex: number) {
  const startOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = (startOfMonth.getDay() + 6) % 7; // Monday-based index
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();

  const totalCells = startWeekday + daysInMonth;
  const trailingDays = (7 - (totalCells % 7)) % 7;

  const cells: { date: Date; day: number; inCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    const day = prevMonthDays - startWeekday + i + 1;
    cells.push({
      date: new Date(year, monthIndex - 1, day),
      day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: new Date(year, monthIndex, day),
      day,
      inCurrentMonth: true,
    });
  }

  for (let day = 1; day <= trailingDays; day += 1) {
    cells.push({
      date: new Date(year, monthIndex + 1, day),
      day,
      inCurrentMonth: false,
    });
  }

  return cells;
}

function groupTasksByDate(tasks: TaskRow[]) {
  const map = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = map.get(task.due_date) ?? [];
    list.push(task);
    map.set(task.due_date, list);
  }
  return map;
}

function DayTasksList({
  tasks,
  onSelectTask,
}: {
  tasks: TaskRow[];
  onSelectTask: (task: TaskRow) => void;
}) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">Rien ce jour-là.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onSelectTask(task)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-muted"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{task.title}</span>
            <span className="text-xs text-muted-foreground">{statusLabel(task.status)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {task.category && <span>{task.category}</span>}
            {task.due_date && <span>Limite: {task.due_date}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

function TaskEditModal({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const updateAction = updateTask.bind(null, task.id);

  return (
    <Modal title="Modifier" onClose={onClose}>
      <form action={updateAction} className="space-y-3">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Titre</label>
          <input name="title" defaultValue={task.title} required className={MODAL_INPUT_CLASS} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Statut</label>
            <select
              name="status"
              defaultValue={task.status}
              className={MODAL_SELECT_CLASS}
            >
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Catégorie</label>
            <input name="category" defaultValue={task.category ?? ""} className={MODAL_INPUT_CLASS} />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Échéance</label>
          <input
            name="due_date"
            type="date"
            defaultValue={task.due_date ?? ""}
            className={MODAL_SELECT_CLASS}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Contenu</label>
          <textarea name="content" defaultValue={task.content ?? ""} className={MODAL_TEXTAREA_CLASS} />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CANCEL_BUTTON_CLASS}
          >
            Annuler
          </button>
          <button className={MODAL_PRIMARY_BUTTON_CLASS}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-card p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-md uppercase tracking-widest font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Fermer
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function filterTasks(tasks: TaskRow[], filter: TaskFilter) {
  const todayKey = toISODate(new Date());

  if (filter === "all") {
    return tasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }

  return tasks.filter((task) => {
    if (filter === "today") {
      return task.status === "todo" && task.due_date === todayKey;
    }
    if (filter === "doing") {
      return task.status === "doing";
    }
    if (filter === "done") {
      return task.status === "done";
    }
    if (filter === "upcoming") {
      return task.status === "todo" && Boolean(task.due_date && task.due_date > todayKey);
    }
    if (filter === "unfinished") {
      return task.status === "unfinished";
    }
    return true;
  });
}

function getFilterCounts(tasks: TaskRow[]) {
  const todayKey = toISODate(new Date());
  const counts: Record<TaskFilter, number> = {
    all: 0,
    today: 0,
    doing: 0,
    done: 0,
    upcoming: 0,
    unfinished: 0,
  };

  for (const task of tasks) {
    if (task.status !== "done") counts.all += 1;
    if (task.status === "doing") counts.doing += 1;
    if (task.status === "done") counts.done += 1;
    if (task.status === "unfinished") counts.unfinished += 1;
    if (task.status === "todo") {
      if (task.due_date === todayKey) counts.today += 1;
      if (task.due_date && task.due_date > todayKey) counts.upcoming += 1;
    }
  }

  return counts;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMonthLabel(date: Date, withYear: boolean) {
  const label = date.toLocaleDateString("fr-FR", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
