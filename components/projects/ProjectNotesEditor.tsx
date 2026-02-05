"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export default function ProjectNotesEditor({
  projectId,
  projectSlug,
  initialContent,
  saveAction,
}: {
  projectId: string;
  projectSlug: string;
  initialContent: string;
  saveAction: (projectId: string, content: string, projectSlug?: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef(initialContent);

  useEffect(() => {
    setValue(initialContent);
    lastSavedRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    if (value === lastSavedRef.current) return;

    setStatus("saving");
    const timer = setTimeout(() => {
      startTransition(async () => {
        await saveAction(projectId, value, projectSlug);
        lastSavedRef.current = value;
        setStatus("saved");
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [value, projectId, projectSlug, startTransition]);

  const helper =
    status === "saving" || isPending
      ? "Enregistrement..."
      : status === "saved"
      ? "Enregistre"
      : "Auto-save";

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ecris tes notes ici..."
        className="min-h-[280px] w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/90"
      />
      <div className="text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}
