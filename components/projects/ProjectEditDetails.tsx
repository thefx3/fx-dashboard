"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_PROJECT_ICON } from "@/lib/projects/icons";
import { PROJECT_ICON_ITEMS } from "@/components/projects/projectIcons";
import {
  buttonBase,
  buttonOutline,
  iconOptionBase,
  inputField,
} from "@/components/projects/styles";

type UpdateAction = (formData: FormData) => void | Promise<void>;

export default function ProjectEditDetails({
  projectId,
  defaultName,
  defaultSlug,
  defaultIcon,
  updateAction,
  updateSlugAction,
}: {
  projectId: string;
  defaultName: string;
  defaultSlug?: string | null;
  defaultIcon?: string;
  updateAction: UpdateAction;
  updateSlugAction: UpdateAction;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const resolvedIcon = defaultIcon ?? DEFAULT_PROJECT_ICON;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const detailsEl = detailsRef.current;
      if (!detailsEl || !detailsEl.hasAttribute("open")) return;
      if (detailsEl.contains(event.target as Node)) return;
      detailsEl.removeAttribute("open");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className="relative w-full sm:w-auto">
      <summary className="list-none flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted sm:w-auto">
        Modifier
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-border bg-background p-3 shadow-lg">
        <form
          action={updateAction}
          onSubmit={() => detailsRef.current?.removeAttribute("open")}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="id" value={projectId} />
          <input type="hidden" name="current_slug" value={defaultSlug ?? ""} />
          <input
            name="name"
            defaultValue={defaultName}
            className={inputField}
          />
          <div className="grid grid-cols-5 gap-2">
            {PROJECT_ICON_ITEMS.map(({ value, label, Icon }) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="icon"
                  value={value}
                  defaultChecked={value === resolvedIcon}
                  aria-label={label}
                  className="sr-only peer"
                />
                <span
                  title={label}
                  className={`${iconOptionBase} h-9 w-9`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className={`${buttonBase} flex-1 bg-primary text-primary-foreground`}
            >
              Enregistrer
            </button>
            <button
              type="submit"
              formAction={updateSlugAction}
              className={`${buttonOutline} flex-1`}
            >
              Mettre à jour
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
