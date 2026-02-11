"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, PenIcon } from "lucide-react";
import { DEFAULT_PROJECT_ICON, normalizeProjectIcon } from "@/lib/projects/icons";
import { PROJECT_ICON_COMPONENTS } from "@/components/projects/projectIcons";
import { textMuted } from "@/components/projects/styles";

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string | null;
  title: string | null;
  icon: string | null;
};

function getProjectLabel(p: ProjectRow) {
  return p.name ?? p.title ?? p.slug ?? p.id;
}

export default function ProjectsNav({ projects }: { projects: ProjectRow[] }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentId = "projects-nav-content";
  return (
    <aside
      className={[
        "w-full shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col self-stretch overflow-hidden transition-[width] duration-200 ease-in-out",
        isCollapsed ? "lg:w-12" : "lg:w-48",
      ].join(" ")}
    >
      <header
        className={[
          "h-10 flex items-center mb-4 lg:mb-6 px-2 lg:px-0",
          isCollapsed ? "justify-end" : "justify-between",
        ].join(" ")}
      >
        {!isCollapsed ? (
          <h2 className="text-xl uppercase tracking-widest font-semibold leading-none">
            Projets
          </h2>
        ) : null}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-controls={contentId}
          aria-expanded={!isCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition hover:bg-accent/10 hover:border-accent/40"
          aria-label={isCollapsed ? "Display projects" : "Hide projects"}
        >
          <ChevronLeft
            className={[
              "h-4 w-4 transition-transform",
              isCollapsed ? "-rotate-180" : "rotate-0",
            ].join(" ")}
            aria-hidden="true"
          />
        </button>
      </header>

      <nav
        id={contentId}
        aria-hidden={isCollapsed}
        className={[
          "flex flex-wrap gap-2 text-sm px-2 lg:px-0 lg:flex-col",
          isCollapsed ? "hidden" : "",
        ].join(" ")}
      >
        {projects.length === 0 ? (
          <div className={`rounded-md px-3 py-2 ${textMuted}`}>Aucun projet</div>
        ) : (
          projects.map((p) => {
            const slugOrId = p.slug ?? p.id;
            const basePath = `/projects/${slugOrId}`;
            const href = `${basePath}/posts`;
            const isActive = pathname
              ? pathname === basePath || pathname.startsWith(`${basePath}/`)
              : false;
            const iconKey = normalizeProjectIcon(p.icon) ?? DEFAULT_PROJECT_ICON;
            const Icon = PROJECT_ICON_COMPONENTS[iconKey];

            return (
              <Link
                key={p.id}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left uppercase tracking-wide font-medium break-words flex-1 lg:flex-none",
                  isActive
                    ? "bg-foreground text-accent shadow-md"
                    : "hover:bg-accent/10",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {getProjectLabel(p)}
              </Link>
            );
          })
        )}
      </nav>

      <Link
        href="/projects"
        className={[
          "mt-3 lg:mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition hover:bg-accent/10 text-sm font-semibold",
          isCollapsed ? "hidden" : "",
        ].join(" ")}
      >
        <PenIcon className="h-4 w-4" aria-hidden="true" />
        Manage projects
      </Link>
    </aside>
  );
}
