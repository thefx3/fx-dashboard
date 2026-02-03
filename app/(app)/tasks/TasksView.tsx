"use client";

import { useMemo, useState } from "react";
import { addTask, deleteTask, setTaskStatus } from "./action";
import { TaskDoneCheckbox } from "./TaskDoneCheckbox";
import { FILTER_LABELS, TaskFilter, TaskRow, TaskStatus, ViewMode, WEEKDAYS, statusLabel } from "./utils";

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  doing: 1,
  done: 2,
  unfinished: 3,
};

function AddTaskForm() {
  return (
    <form action={addTask} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex w-full gap-2 justify-center items-center">
        <input
          name="title"
          required
          className="h-10 w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0 "
          placeholder="Nouvelle tâche…"
        />
      </div>
      <div className="flex w-full gap-2 justify-start items-center">
        <div className="flex gap-2 justify-center items-center">
          <input
            name="due_date"
            type="date"
            className="text-sm h-8 rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0"
          />
        </div>

        <div className="flex gap-2 justify-center items-center">
          <label className="text-sm font-medium">Catégorie</label>
          <input
            name="category"
            className="text-sm h-8 rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary/90 focus:ring-offset-0"
            placeholder="Ex: dev, sport, admin…"
          />
        </div>

        <button className="text-sm cursor-pointer h-8 rounded-md bg-primary px-3 text-primary-foreground">
          Ajouter
        </button>
      </div>
    </form>
  );
}

export function TasksView({ tasks }: { tasks: TaskRow[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<TaskFilter>("today");

  return (
    <div className="space-y-6 w-full flex flex-col">
      <header className="flex items-center gap-4">
        <h1 className="text-xl font-semibold leading-none">Mes tâches</h1>
        <div className="inline-flex h-8 items-center rounded-sm border border-border bg-card p-1 text-sm gap-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={
              viewMode === "list"
                ? "cursor-pointer h-6 rounded-sm px-3 bg-accent/20"
                : "cursor-pointer h-6 px-3 rounded-sm hover:bg-primary/20"
            }
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={
              viewMode === "calendar"
                ? "cursor-pointer h-6 rounded-sm px-3 bg-accent/20"
                : "cursor-pointer h-6 px-3 rounded-sm hover:bg-primary/20"
            }
          >
            Calendrier
          </button>
        </div>
      </header>


      <div className="flex flex-1 w-full">
        {viewMode === "list" ? (
          <div className="flex w-full gap-6">
            <TaskFilterNav activeFilter={filter} onChange={setFilter} />
          
            <div className="space-y-4 w-full">
              <AddTaskForm />
              <div className="flex gap-6">
                <TaskList tasks={filterTasks(tasks, filter)} showStatus={filter === "all"} />
              </div>
            </div>
          </div>
        ) : (
          <CalendarView tasks={tasks} />
        )}
      </div>
    </div>
  );
}

function TaskFilterNav({ activeFilter,onChange, }: { activeFilter: TaskFilter; onChange: (filter: TaskFilter) => void; }) {
  return (
    <aside className="w-48 shrink-0 border-r border-border">
      <nav className="flex flex-col gap-1 text-sm">
        {(Object.keys(FILTER_LABELS) as TaskFilter[]).map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            onClick={() => onChange(filterKey)}
            className={
              filterKey === activeFilter
                ? "bg-muted px-3 py-2 text-left"
                : "px-3 py-2 text-left hover:bg-primary/20"
            }
          >
            {FILTER_LABELS[filterKey]}
          </button>
        ))}
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
    <div className="w-full border-white grid grid-cols-3 items-center gap-3 rounded-xl bg-card p-2">
      <div className="flex gap-2 items-center">
        <TaskDoneCheckbox taskId={task.id} status={task.status} />
        <p className="font-medium truncate">{task.title}</p>
        {showStatus && (
          <span className="text-xs rounded-md border border-border px-2 py-1 text-muted-foreground">
            {statusLabel(task.status)}
          </span>
        )}
      </div>

      <div className="flex justify-end items-center gap-2">
        {task.category && (
          <span className="text-xs rounded-md bg-muted px-2 py-1">{task.category}</span>
        )}
        {task.due_date && (
          <span className="text-xs text-muted-foreground">Limite: {task.due_date}</span>
        )}
      </div>

      <div className="flex flex-1 gap-2 justify-end items-center">
        <form action={abandonAction}>
          <button className="h-8 text-sm rounded-md border border-border bg-background px-3 hover:bg-muted">
            Abandonner
          </button>
        </form>

        <form action={doingAction}>
          <button className="h-8 text-sm rounded-md border border-border bg-accent/70 px-3 hover:bg-accent/90">
            En cours
          </button>
        </form>



        <form action={deleteAction}>
          <button className="h-8 text-sm rounded-md bg-destructive/80 px-3 text-destructive-foreground hover:bg-destructive/90">
            Supprimer
          </button>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: TaskRow[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const monthIndex = today.getMonth();

  const monthName = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const startOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = (startOfMonth.getDay() + 6) % 7; // Monday-based index

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks]);

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const blanks = Array.from({ length: startWeekday });
  const todayKey = toISODate(today);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground capitalize">{monthName}</div>
      <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="min-h-24 rounded-md border border-transparent" />
        ))}
        {days.map((day) => {
          const dateKey = toISODate(new Date(year, monthIndex, day));
          const dayTasks = tasksByDate.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;

          return (
            <div
              key={dateKey}
              className={
                isToday
                  ? "min-h-24 rounded-md border border-primary bg-primary/5 p-2"
                  : "min-h-24 rounded-md border border-border bg-card p-2"
              }
            >
              <div className="text-xs font-medium">{day}</div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className={
                      task.status === "done"
                        ? "truncate text-xs text-muted-foreground line-through"
                        : "truncate text-xs"
                    }
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayTasks.length - 2} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function filterTasks(tasks: TaskRow[], filter: TaskFilter) {
  const todayKey = toISODate(new Date());

  if (filter === "all") {
    return [...tasks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
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
    return true;
  });
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
