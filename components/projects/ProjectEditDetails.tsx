"use client";

import { useRef } from "react";

type UpdateAction = (formData: FormData) => void | Promise<void>;

export default function ProjectEditDetails({
  projectId,
  defaultName,
  updateAction,
}: {
  projectId: string;
  defaultName: string;
  updateAction: UpdateAction;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className="relative">
      <summary className="list-none inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted">
        Modifier
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-border bg-background p-3 shadow-lg">
        <form
          action={updateAction}
          onSubmit={() => detailsRef.current?.removeAttribute("open")}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="id" value={projectId} />
          <input
            name="name"
            defaultValue={defaultName}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
            Enregistrer
          </button>
        </form>
      </div>
    </details>
  );
}
