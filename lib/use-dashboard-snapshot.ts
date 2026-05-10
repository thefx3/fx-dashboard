"use client";

import { useEffect, useState } from "react";
import {
  dashboardEvents,
  getCurrentUserId,
  getLatestDashboardSnapshot,
  loadDashboardSnapshot,
  migrateLocalDashboardData,
  subscribeDashboardChanges,
  type DashboardSettings,
  type JournalEntries,
} from "@/lib/dashboard-data";

type DashboardSnapshot = {
  settings: DashboardSettings;
  entries: JournalEntries;
};

const emptySnapshot: DashboardSnapshot = {
  settings: { startDate: "", startDateChangedAt: "", lastDeleteDate: "" },
  entries: {},
};

export function useDashboardSnapshot() {
  const initialSnapshot = getLatestDashboardSnapshot();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(
    initialSnapshot ?? emptySnapshot,
  );
  const [loaded, setLoaded] = useState(Boolean(initialSnapshot));

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function refresh(force = false) {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setLoaded(true);
          return;
        }

        await migrateLocalDashboardData(userId);
        const nextSnapshot = await loadDashboardSnapshot(userId, force);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSnapshot(emptySnapshot);
          setLoaded(true);
        }
      }
    }

    async function initialize() {
      const userId = await getCurrentUserId();
      if (!userId) {
        setLoaded(true);
        return;
      }

      unsubscribe = subscribeDashboardChanges(userId, () => {
        void refresh(true);
      });

      await refresh();
    }

    function handleLocalChange() {
      void refresh(false);
    }

    void initialize();
    window.addEventListener(dashboardEvents.settings, handleLocalChange);
    window.addEventListener(dashboardEvents.journal, handleLocalChange);

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener(dashboardEvents.settings, handleLocalChange);
      window.removeEventListener(dashboardEvents.journal, handleLocalChange);
    };
  }, []);

  return { ...snapshot, loaded };
}
