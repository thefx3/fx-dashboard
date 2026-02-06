"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { textMuted, textareaBase } from "@/components/projects/styles";

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
  const valueRef = useRef(initialContent);
  const hasLocalEdits = useRef(false);

  useEffect(() => {
    if (hasLocalEdits.current) return;
    setValue(initialContent);
    lastSavedRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (value === lastSavedRef.current) return;
    hasLocalEdits.current = true;

    setStatus("saving");
    const snapshot = value;
    const timer = setTimeout(() => {
      startTransition(async () => {
        await saveAction(projectId, snapshot, projectSlug);
        lastSavedRef.current = snapshot;
        if (valueRef.current === snapshot) {
          setStatus("saved");
          hasLocalEdits.current = false;
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, projectId, projectSlug, startTransition]);

  const helper =
    status === "saving" || isPending
      ? "Saving..."
      : status === "saved"
      ? "Saved"
      : "Auto-save";

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write something here..."
        className={`${textareaBase} min-h-[280px] w-full`}
      />
      <div className={textMuted}>{helper}</div>
    </div>
  );
}
