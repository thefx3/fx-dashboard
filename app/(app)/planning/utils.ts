export type TaskStatus = "todo" | "doing" | "done" | "unfinished";

export type TaskRow = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
  project_id: string | null;
};

export type ViewMode = "list" | "calendar";
export type TaskFilter = "all" | "today" | "tomorrow" | "doing" | "done" | "upcoming" | "unfinished";
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  doing: 1,
  done: 2,
  unfinished: 3,
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
  unfinished: "Abandoned",
};

export const FILTER_LABELS: Record<TaskFilter, string> = {
  all: "All",
  today: "Today",
  tomorrow: "Tomorrow",
  doing: "Doing",
  done: "Done",
  upcoming: "Upcoming",
  unfinished: "Abandoned",
};

export const FILTER_ORDER: TaskFilter[] = [
  "all",
  "today",
  "tomorrow",
  "doing",
  "done",
  "upcoming",
  "unfinished",
];

export const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
  { value: "unfinished", label: "Abandoned" },
];

export function statusLabel(status: TaskStatus) {
  return STATUS_LABELS[status];
}

export function isTaskStatus(value: string): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done" || value === "unfinished";
}
