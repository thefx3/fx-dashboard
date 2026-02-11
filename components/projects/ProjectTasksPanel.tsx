"use client";

import { useMemo, useState } from "react";
import { inputFieldFocus, textMuted } from "@/components/projects/styles";

type TaskRow = {
  id: string;
  title: string;
  status: "todo" | "done" | "doing" | "unfinished";
  created_at: string;
};

type Action = (formData: FormData) => void | Promise<void>;

export default function ProjectTasksPanel({
  tasks,
  projectId,
  projectSlug,
  tasksColumnMissing,
  initialFilter = "open",
  addAction,
  setStatusAction,
  deleteAction,
}: {
  tasks: TaskRow[];
  projectId: string;
  projectSlug: string;
  tasksColumnMissing: boolean;
  initialFilter?: "open" | "done";
  addAction: Action;
  setStatusAction: Action;
  deleteAction: Action;
}) {
  const [filter, setFilter] = useState<"open" | "done">(initialFilter);

  const filteredTasks = useMemo(() => {
    return filter === "done"
      ? tasks.filter((task) => task.status === "done")
      : tasks.filter((task) => task.status !== "done");
  }, [filter, tasks]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-widest">
          Tasks to do
        </div>
        {!tasksColumnMissing && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={[
                "rounded-md border px-2 py-1",
                filter === "open"
                  ? "border-foreground bg-foreground text-accent"
                  : "border-border text-muted-foreground transition hover:bg-accent/10",
              ].join(" ")}
            >
              To do
            </button>
            <button
              type="button"
              onClick={() => setFilter("done")}
              className={[
                "rounded-md border px-2 py-1",
                filter === "done"
                  ? "border-foreground bg-foreground text-accent"
                  : "border-border text-muted-foreground transition hover:bg-accent/10",
              ].join(" ")}
            >
              Finished
            </button>
          </div>
        )}
      </div>

      {tasksColumnMissing ? (
        <p className={`mt-3 ${textMuted}`}>
          Add the <code>project_id</code> column in <code>tasks</code> to enable
          project-specific tasks.
        </p>
      ) : (
        <>
          <form action={addAction} className="mt-4 flex items-center gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="project_slug" value={projectSlug} />
            <input
              name="title"
              required
              placeholder="Nouvelle tache"
              className={`${inputFieldFocus} flex-1`}
            />
            <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90 hover:ring-1 hover:ring-accent/40">
              Add
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {filteredTasks.length === 0 ? (
              <p className={textMuted}>No tasks for this filter.</p>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === "done";
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <form action={setStatusAction}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="project_slug" value={projectSlug} />
                      <input
                        type="hidden"
                        name="status"
                        value={isDone ? "todo" : "done"}
                      />
                      <button
                        className="h-5 w-5 rounded border border-border"
                        aria-label={isDone ? "Mark as todo" : "Mark as done"}
                      />
                    </form>
                    <span
                      className={
                        isDone ? "text-sm line-through text-muted-foreground" : "text-sm"
                      }
                    >
                      {task.title}
                    </span>
                    <form action={deleteAction} className="ml-auto">
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="project_slug" value={projectSlug} />
                      <button className={`${textMuted} transition hover:text-accent hover:underline hover:decoration-accent/60`}>
                        Delete
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
