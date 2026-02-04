"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string | null;
  title: string | null;
};

function getProjectLabel(p: ProjectRow) {
  return p.name ?? p.title ?? p.slug ?? p.id;
}

export default function ProjectsNav({ projects }: { projects: ProjectRow[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-48 shrink-0 border-r border-border flex flex-col self-stretch">
      <header className="h-10 flex items-center mb-6">
        <h2 className="text-xl uppercase tracking-widest font-semibold leading-none">
          Projets
        </h2>
      </header>

      <nav className="flex flex-col gap-2 text-sm">
        {projects.length === 0 ? (
          <div className="rounded-md px-3 py-2 text-xs text-muted-foreground">
            Aucun projet
          </div>
        ) : (
          projects.map((p) => {
            const slugOrId = p.slug ?? p.id;
            const basePath = `/projects/${slugOrId}`;
            const href = `${basePath}/posts`;
            const isActive = pathname
              ? pathname === basePath || pathname.startsWith(`${basePath}/`)
              : false;

            return (
              <Link
                key={p.id}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left",
                  isActive
                    ? "bg-foreground text-accent shadow-md"
                    : "hover:bg-primary/20",
                ].join(" ")}
              >
                {getProjectLabel(p)}
              </Link>
            );
          })
        )}
      </nav>

      <Link
        href="/projects"
        className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-primary/20 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Ajouter un projet
      </Link>
    </aside>
  );
}
