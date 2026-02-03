export type TaskStatus = "todo" | "doing" | "done" | "unfinished";

export type TaskRow = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
};

export type ViewMode = "list" | "calendar";
export type TaskFilter = "all" | "today" | "doing" | "done" | "upcoming";
export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const FILTER_LABELS: Record<TaskFilter, string> = {
  all: "Toutes",
  today: "Ma journée",
  doing: "En cours",
  done: "Terminés",
  upcoming: "À venir",
};

export function statusLabel(s: TaskStatus) {
  if (s === "todo") return "À faire";
  if (s === "doing") return "En cours";
  if (s === "done") return "Terminé";
  return "Abandonné";
}

export function nextStatus(current: TaskStatus): TaskStatus {
  if (current === "todo") return "doing";
  if (current === "doing") return "done";
  return "todo"; // done ou unfinished => retour à todo (si tu veux)
}
