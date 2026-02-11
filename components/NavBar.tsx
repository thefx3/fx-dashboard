"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { APP_NAV, APPS, type AppKey } from "@/lib/app";
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

type NavBarProps = {
  appKey?: AppKey;
  projects?: ProjectRow[];
};

const NAV_LINK_BASE =
  "group inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition hover:bg-primary/20 hover:text-foreground";
const NAV_LINK_ACTIVE =
  "shadow-sm ring-1 ring-primary/30 hover:bg-accent/90 bg-foreground text-accent";
const NAV_LINK_INACTIVE = "text-muted-foreground";
const NAV_ICON_ACTIVE = "text-accent";
const NAV_ICON_INACTIVE = "group-hover:text-primary";

const PROJECTS_EMPTY_CLASS = `pl-11 ${textMuted}`;
const PROJECTS_SUBNAV_CLASS = "flex flex-col gap-1 pl-6";
const PROJECTS_ITEM_BASE =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-semibold uppercase tracking-widest";
const PROJECTS_ITEM_ACTIVE = "text-accent bg-primary/20 shadow-sm";
const PROJECTS_ITEM_INACTIVE =
  "text-muted-foreground hover:bg-primary/10 hover:text-foreground";
const PROJECTS_TOGGLE_BASE =
  "absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition cursor-pointer";

export default function NavBar({ appKey = "main", projects = [] }: NavBarProps) {
  const pathname = usePathname();
  const [isProjectsOpen, setIsProjectsOpen] = useState(
    pathname ? pathname.startsWith("/projects") : false,
  );
  const projectsSubnavId = "projects-subnav";

  const links = APP_NAV[appKey] ?? [];
  const otherLinks = links.map((item) => item.href).filter((href) => href !== "/");
  const app = APPS.find((item) => item.key === appKey);
  const activeRingClass = app?.colorClass
    ? app.colorClass.replace(/^text-/, "ring-")
    : "ring-slate-900/20";

  return (
    <aside className="hidden h-screen w-full shrink-0 border-r border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur lg:flex lg:w-64 lg:flex-col">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-4 px-6 pt-6 text-lg font-semibold uppercase tracking-[0.25em] text-foreground"
      >
        <span className="relative inline-flex h-16 w-16 items-center justify-center">
          <Image
            src="/logo-white.png"
            alt="Logo"
            width={45}
            height={45}
            className={`h-16 w-16 object-contain ${activeRingClass} dark:hidden`}
            priority
          />
          <Image
            src="/logo-black.png"
            alt="Logo"
            width={45}
            height={45}
            className={`hidden h-16 w-16 object-contain ${activeRingClass} dark:block`}
            priority
          />
        </span>
        <span className="text-2xl text-foreground">AIO</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-3 px-4 pb-6">
        {links.map((link) => {
          const isActive = getNavLinkActive(pathname, link.href, otherLinks);
          const Icon = link.Icon;
          const isProjectsLink = link.href === "/projects";

          return (
            <div key={link.href} className="flex flex-col gap-2">
              {isProjectsLink ? (
                <div className="relative">
                  <NavItem
                    href={link.href}
                    label={link.label}
                    Icon={Icon}
                    isActive={isActive}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setIsProjectsOpen((prev) => !prev)}
                    aria-controls={projectsSubnavId}
                    aria-expanded={isProjectsOpen}
                    aria-label={
                      isProjectsOpen ? "Replier les projets" : "Déplier les projets"
                    }
                    className={[
                      PROJECTS_TOGGLE_BASE,
                      isActive ? NAV_ICON_ACTIVE : NAV_LINK_INACTIVE,
                    ].join(" ")}
                  >
                    <ChevronDown
                      className={[
                        "h-4 w-4 transition-transform",
                        isProjectsOpen ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              ) : (
                <NavItem
                  href={link.href}
                  label={link.label}
                  Icon={Icon}
                  isActive={isActive}
                />
              )}
              {isProjectsLink ? (
                isProjectsOpen ? (
                  <ProjectsSubNav
                    id={projectsSubnavId}
                    pathname={pathname}
                    projects={projects}
                  />
                ) : null
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function getNavLinkActive(
  pathname: string | null,
  href: string,
  otherLinks: string[],
) {
  if (!pathname) return false;
  if (href === "/") {
    return (
      pathname === "/" ||
      !otherLinks.some(
        (otherHref) =>
          pathname === otherHref || pathname.startsWith(`${otherHref}/`),
      )
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  Icon,
  isActive,
  className,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        NAV_LINK_BASE,
        className ?? "",
        isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE,
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="inline-flex items-center gap-3">
        <Icon
          className={`h-4 w-4 ${isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`}
          aria-hidden
        />
        {label}
      </span>
    </Link>
  );
}

function getProjectLabel(p: ProjectRow) {
  return p.name ?? p.title ?? p.slug ?? p.id;
}

function ProjectsSubNav({
  id,
  pathname,
  projects,
}: {
  id: string;
  pathname: string | null;
  projects: ProjectRow[];
}) {
  if (projects.length === 0) {
    return (
      <div id={id} className={PROJECTS_EMPTY_CLASS}>
        Aucun projet
      </div>
    );
  }

  return (
    <div id={id} className={PROJECTS_SUBNAV_CLASS}>
      {projects.map((project) => {
        const slugOrId = project.slug ?? project.id;
        const basePath = `/projects/${slugOrId}`;
        const href = `${basePath}/posts`;
        const isActive = pathname
          ? pathname === basePath || pathname.startsWith(`${basePath}/`)
          : false;
        const iconKey =
          normalizeProjectIcon(project.icon) ?? DEFAULT_PROJECT_ICON;
        const Icon = PROJECT_ICON_COMPONENTS[iconKey];

        return (
          <Link
            key={project.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={[
              PROJECTS_ITEM_BASE,
              isActive ? PROJECTS_ITEM_ACTIVE : PROJECTS_ITEM_INACTIVE,
            ].join(" ")}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {getProjectLabel(project)}
          </Link>
        );
      })}
    </div>
  );
}
