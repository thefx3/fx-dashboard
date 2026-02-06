//lib/app.ts

import {
  FolderKanban,
  Globe2,
  HomeIcon,
  ListChecks,
  LucideIcon,
  Settings,
  Users,
} from "lucide-react";

export const APPS = [
  { key: "main", href: "/", label: "Home", Icon: HomeIcon, colorClass: "text-accent" },
];
export type AppKey = (typeof APPS)[number]["key"];
export type AppItem = (typeof APPS)[number];

export type NavLink = { href: string; label: string; Icon: LucideIcon};

export const APP_NAV: Record<AppKey, NavLink[]> = {
  main: [
    { href: "/", label: "Home", Icon: HomeIcon },
    { href: "/websites", label: "Websites", Icon: Globe2 },
    { href: "/planning", label: "Planning", Icon: ListChecks },
    { href: "/projects", label: "Projects", Icon: FolderKanban },
    { href: "/clients", label: "Clients", Icon: Users },
    { href: "/settings", label: "Settings", Icon: Settings },
  ],
} as const;


