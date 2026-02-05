"use client";

import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { DEFAULT_PROJECT_ICON } from "@/lib/projects/icons";
import { PROJECT_ICON_ITEMS } from "@/components/projects/projectIcons";

export default function ProjectIconPicker({
  name,
  defaultValue,
  primaryCount = 6,
}: {
  name: string;
  defaultValue?: string;
  primaryCount?: number;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const resolvedDefault = defaultValue ?? DEFAULT_PROJECT_ICON;
  const primaryIcons = PROJECT_ICON_ITEMS.slice(0, primaryCount);
  const extraIcons = PROJECT_ICON_ITEMS.slice(primaryCount);

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
    <div className="flex items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {primaryIcons.map(({ value, label, Icon }) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={value === resolvedDefault}
              aria-label={label}
              className="sr-only peer"
            />
            <span
              title={label}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </label>
        ))}
      </div>

      {extraIcons.length > 0 && (
        <details ref={detailsRef} className="relative">
          <summary className="list-none inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="w-60 absolute right-0 mt-2 grid grid-cols-5 rounded-md border border-border bg-background p-2 shadow-lg">
            {extraIcons.map(({ value, label, Icon }) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  value={value}
                  defaultChecked={value === resolvedDefault}
                  aria-label={label}
                  className="sr-only peer"
                  onChange={() => detailsRef.current?.removeAttribute("open")}
                />
                <span
                  title={label}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
