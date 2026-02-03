"use client";

import { useEffect, useState, useTransition } from "react";
import { setTaskStatus } from "./action";
import { TaskStatus } from "./utils";

type TaskDoneCheckboxProps = {
  taskId: string;
  status: TaskStatus;
};

export function TaskDoneCheckbox({ taskId, status }: TaskDoneCheckboxProps) {
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(status === "done");

  useEffect(() => {
    setChecked(status === "done");
  }, [status]);

  return (
    <input
      type="checkbox"
      aria-label="Marquer comme terminé"
      checked={checked}
      disabled={isPending}
      onChange={(event) => {
        const isChecked = event.target.checked;
        const nextStatus: TaskStatus = isChecked ? "done" : "todo";
        setChecked(isChecked);
        startTransition(async () => {
          await setTaskStatus(taskId, nextStatus);
        });
      }}
      className="h-4 w-4 rounded border border-input bg-background"
    />
  );
}
