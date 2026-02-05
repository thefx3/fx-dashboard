"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  buttonBase,
  buttonDangerSmall,
  buttonOutline,
  inputField,
  textMuted,
} from "@/components/projects/styles";

type DeleteAction = (formData: FormData) => void | Promise<void>;

function SubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={[
        buttonBase,
        isDisabled
          ? "cursor-not-allowed border border-border text-muted-foreground"
          : "border border-destructive/50 text-destructive hover:bg-destructive/10",
      ].join(" ")}
    >
      {pending ? "Suppression..." : label}
    </button>
  );
}

export default function ProjectDeleteDialog({
  projectId,
  projectName,
  deleteAction,
}: {
  projectId: string;
  projectName: string;
  deleteAction: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedName = projectName.trim();
  const trimmedValue = value.trim();
  const isMatch = trimmedValue === normalizedName;
  const showError = trimmedValue.length > 0 && !isMatch;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setValue("");
  };

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonDangerSmall}
      >
        Supprimer
      </button>

      {open && (
        <div className="fixed inset-0 z-[210]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onPointerDown={close}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-4 shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="text-sm font-semibold">
              Supprimer “{projectName}” ?
            </div>
            <p className={`mt-1 ${textMuted}`}>
              Tapez le nom exact du projet pour confirmer la suppression.
            </p>

            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!isMatch) {
                  event.preventDefault();
                  return;
                }
                close();
              }}
              className="mt-3 flex flex-col gap-3"
            >
              <input type="hidden" name="id" value={projectId} />
              <input
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={normalizedName}
                className={inputField}
                aria-label={`Confirmer la suppression de ${projectName}`}
              />
              {showError && (
                <p className="text-xs text-destructive">
                  Le nom ne correspond pas. Tapez exactement “{normalizedName}”.
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className={buttonOutline}
                >
                  Annuler
                </button>
                <SubmitButton disabled={!isMatch} label="Supprimer" />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
