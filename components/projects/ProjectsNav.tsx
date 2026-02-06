"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenIcon } from "lucide-react";
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
  return (
    <aside className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col self-stretch">
      <header className="h-10 flex items-center mb-4 lg:mb-6 px-2 lg:px-0">
        <h2 className="text-xl uppercase tracking-widest font-semibold leading-none">
          Projets
        </h2>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm px-2 lg:px-0 lg:flex-col">
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
                    : "hover:bg-primary/20",
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
        className="mt-3 lg:mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-primary/20 text-sm font-semibold"
      >
        <PenIcon className="h-4 w-4" aria-hidden="true" />
        Manage projects
      </Link>
    </aside>
  );
}
