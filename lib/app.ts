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
    { href: "/websites", label: "Mes sites", Icon: Globe2 },
    { href: "/tasks", label: "Mes tâches", Icon: ListChecks },
    { href: "/projects", label: "Mes projets", Icon: FolderKanban },
    { href: "/clients", label: "Clients", Icon: Users },
    { href: "/settings", label: "Paramètres", Icon: Settings },
  ],
} as const;
