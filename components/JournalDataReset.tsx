"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  dashboardEvents,
  daysBetween,
  getCurrentUserId,
  loadDashboardSettings,
  migrateLocalDashboardData,
  saveStartDate as persistStartDate,
} from "@/lib/dashboard-data";
import { deleteUserActivityData } from "@/lib/fpair-data";

export default function JournalDataReset({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [startDateChangedAt, setStartDateChangedAt] = useState("");
  const [lastDeleteDate, setLastDeleteDate] = useState("");
  const [draftStartDate, setDraftStartDate] = useState(today);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const canChangeStartDate =
    !startDateChangedAt || elapsedDays(startDateChangedAt, today) >= 30;
  const canDeleteData =
    !lastDeleteDate || elapsedDays(lastDeleteDate, today) >= 30;
  const startDateLockedDays = remainingLockDays(startDateChangedAt, today);
  const deleteLockedDays = remainingLockDays(lastDeleteDate, today);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setSyncError(null);
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;

      try {
        await migrateLocalDashboardData(currentUserId);
        const settings = await loadDashboardSettings(currentUserId);
        if (cancelled) return;

        setUserId(currentUserId);
        setStartDateChangedAt(settings.startDateChangedAt);
        setLastDeleteDate(settings.lastDeleteDate);
        setDraftStartDate(settings.startDate || today);
      } catch {
        if (!cancelled) setSyncError(getErrorMessage());
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [today]);

  async function deleteData() {
    if (!canDeleteData || !userId || pending) return;

    setPending(true);
    setSyncError(null);
    try {
      const settings = await loadDashboardSettings(userId);
      await deleteUserActivityData(userId, today, settings);
      setDeletedCount(null);
      setStartDateChangedAt(today);
      setDraftStartDate(today);
      setLastDeleteDate(today);
      window.dispatchEvent(new Event(dashboardEvents.settings));
      window.dispatchEvent(new Event(dashboardEvents.journal));
      setOpen(false);
      setConfirmation("");
    } catch {
      setSyncError(getErrorMessage());
    } finally {
      setPending(false);
    }
  }

  async function saveStartDate(value: string) {
    if (!userId || pending) return;

    setPending(true);
    setSyncError(null);
    try {
      await persistStartDate(userId, value);
      setStartDateChangedAt(today);
      setDraftStartDate(value);
      window.dispatchEvent(new Event(dashboardEvents.settings));
    } catch {
      setSyncError(getErrorMessage());
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      {syncError ? (
        <p className="form-message border-red-200 bg-red-50 text-red-700">
          {syncError}
        </p>
      ) : null}
      <div className="surface p-4">
        <p className="eyebrow">Day counter</p>
        <h2 className="mt-2 text-xl font-semibold">Start day</h2>
        <p className="mt-2 text-sm leading-6 text-site-muted">
          Define the start date for the dashboard counter. Once set, it can only
          be changed after 30 days.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            aria-label="Dashboard start date"
            type="date"
            value={draftStartDate}
            onChange={(event) => setDraftStartDate(event.target.value)}
            disabled={!canChangeStartDate}
            className="form-input"
          />
          <button
            type="button"
            onClick={() => saveStartDate(draftStartDate)}
            disabled={!canChangeStartDate || !draftStartDate || pending || !userId}
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-45"
          >
            Save
          </button>
        </div>

        {!canChangeStartDate ? (
          <p className="mt-2 text-sm text-site-muted">
            Locked for {startDateLockedDays} more days.
          </p>
        ) : null}
      </div>

      <div className="surface p-4">
        <p className="eyebrow">User data</p>
        <h2 className="mt-2 text-xl font-semibold">Delete user data</h2>
        <p className="mt-2 text-sm leading-6 text-site-muted">
          Delete quests, journal, self-care, lists and stats data. The account
          profile is kept. This action is available once every 30 days.
        </p>

      {deletedCount !== null ? (
        <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {deletedCount} entries deleted. Refresh the dashboard if the old data
          is still visible.
        </p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canDeleteData || pending || !userId}
          className="mt-3 inline-flex min-h-10 items-center gap-2 border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete user data
        </button>
      ) : (
        <div className="mt-3 border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">
            Type DELETE to confirm.
          </p>
          <input
            aria-label="Delete confirmation"
            className="form-input mt-3 bg-white"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={deleteData}
              disabled={confirmation !== "DELETE" || !canDeleteData || pending}
              className="inline-flex min-h-10 items-center px-3 text-sm font-semibold text-white bg-red-700 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
              }}
              className="inline-flex min-h-10 items-center border border-site bg-card px-3 text-sm font-semibold text-site-muted transition hover:text-site"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
        {!canDeleteData ? (
          <p className="mt-2 text-sm text-site-muted">
            Delete available in {deleteLockedDays} more days.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getErrorMessage() {
  return "Sync failed. Please refresh the page or check the dashboard schema.";
}

function elapsedDays(startDate: string, endDate: string) {
  return Math.max(0, daysBetween(startDate, endDate));
}

function remainingLockDays(startDate: string, endDate: string) {
  if (!startDate) return 0;
  return Math.max(0, 30 - elapsedDays(startDate, endDate));
}
