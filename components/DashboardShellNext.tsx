"use client";

import FxOSDashboard, { type FxOSMainView } from "@/components/FxOSDashboardNext";

type DashboardView = "overview" | "settings" | "journal" | "trades" | "stats" | "lists" | "playbooks";

type DashboardShellNextProps = {
  email: string;
  journalDate?: string;
  view?: DashboardView;
};

export default function DashboardShellNext({ email, view = "overview" }: DashboardShellNextProps) {
  return (
    <FxOSDashboard
      email={email}
      initialFocusTab={view === "trades" ? "trading" : "planning"}
      initialView={getFxOSView(view)}
    />
  );
}

function getFxOSView(view: DashboardView): FxOSMainView {
  if (view === "trades") return "focus";
  if (view === "lists") return "private";
  if (view === "playbooks") return "projects";
  if (view === "settings") return "private";
  if (view === "journal" || view === "stats") return "private";
  return "focus";
}
