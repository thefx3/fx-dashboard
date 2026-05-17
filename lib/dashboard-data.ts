"use client";

import { supabase } from "@/lib/supabase/client";
import { getTodayIsoDate } from "@/lib/date";

export type ActivityStatus = "positive" | "negative";
export type MoodValue = "negative" | "neutral" | "positive";
export type ProgressRange = "week" | "month" | "year";

export type Activity = {
  id: string;
  text: string;
  status: ActivityStatus;
};

export type PlannedTask = {
  id: string;
  text: string;
  completed: boolean | null;
  createdAt: string;
};

export type JournalEntry = {
  wants: PlannedTask[];
  morningFeeling: string;
  morningMood: MoodValue | null;
  eveningFeeling: string;
  eveningMood: MoodValue | null;
  activities: Activity[];
  diaryText: string;
};

export type JournalEntries = Record<string, JournalEntry>;

export type DashboardSettings = {
  startDate: string;
  startDateChangedAt: string;
  lastDeleteDate: string;
};

type SettingsRow = {
  start_date: string | null;
  start_date_changed_at: string | null;
  last_delete_date: string | null;
};

type DashboardSnapshot = {
  settings: DashboardSettings;
  entries: JournalEntries;
};

type EntryRow = {
  diary_text?: string | null;
  entry_date: string;
  morning_feeling: string | null;
  morning_mood: string | null;
  evening_feeling: string | null;
  evening_mood: string | null;
};

type TaskRow = {
  id: string;
  entry_date: string;
  position: number | null;
  text: string | null;
  completed: boolean | null;
  created_at: string | null;
};

type ActivityRow = {
  id: string;
  entry_date: string;
  position: number | null;
  text: string | null;
  status: string | null;
};

export const emptyEntry: JournalEntry = {
  wants: [],
  morningFeeling: "",
  morningMood: null,
  eveningFeeling: "",
  eveningMood: null,
  activities: [],
  diaryText: "",
};

export const dashboardEvents = {
  settings: "fpair-day-settings-change",
  journal: "fpair-journal-data-change",
};

const journalStorageKey = "fpair-dashboard-journal";
const startDateKey = "fpair-dashboard-start-date";
const lastDeleteDateKey = "fpair-dashboard-last-delete-date";
const migrationKeyPrefix = "fpair-dashboard-supabase-migration";
const snapshotCache = new Map<
  string,
  { snapshot: DashboardSnapshot; cachedAt: number }
>();
const snapshotCacheTtlMs = 60_000;
const journalSaveQueue = new Map<string, Promise<void>>();
let latestSnapshot: DashboardSnapshot | null = null;

export async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function migrateLocalDashboardData(userId: string) {
  if (typeof window === "undefined") return;

  const migrationKey = `${migrationKeyPrefix}-${userId}`;
  if (window.localStorage.getItem(migrationKey)) return;

  const startDate = window.localStorage.getItem(startDateKey);
  const lastDeleteDate = window.localStorage.getItem(lastDeleteDateKey);

  if (startDate || lastDeleteDate) {
    await saveDashboardSettings(userId, {
      startDate: startDate ?? "",
      startDateChangedAt: getTodayIsoDate(),
      lastDeleteDate: lastDeleteDate ?? "",
    });
  }

  const saved = window.localStorage.getItem(journalStorageKey);
  if (saved) {
    try {
      const entries = normalizeEntries(JSON.parse(saved) as JournalEntries);
      for (const [date, entry] of Object.entries(entries)) {
        await saveJournalEntry(userId, date, entry);
      }
    } catch {
      // Ignore malformed legacy localStorage. Supabase remains the source of truth.
    }
  }

  window.localStorage.setItem(migrationKey, "1");
}

export async function loadDashboardSettings(
  userId: string,
): Promise<DashboardSettings> {
  const { data, error } = await supabase
    .from("dashboard_settings")
    .select("start_date,start_date_changed_at,last_delete_date")
    .eq("user_id", userId)
    .maybeSingle<SettingsRow>();

  if (isMissingStartDateChangedAtError(error)) {
    return loadDashboardSettingsWithoutChangedAt(userId);
  }

  if (error) {
    return defaultDashboardSettings();
  }

  if (!data) {
    return createDefaultDashboardSettings(userId);
  }

  return {
    startDate: data.start_date ?? "",
    startDateChangedAt: data.start_date_changed_at ?? "",
    lastDeleteDate: data.last_delete_date ?? "",
  };
}

export async function saveDashboardSettings(
  userId: string,
  settings: DashboardSettings,
) {
  const { error } = await supabase.from("dashboard_settings").upsert({
    user_id: userId,
    start_date: settings.startDate || null,
    start_date_changed_at: settings.startDateChangedAt || null,
    last_delete_date: settings.lastDeleteDate || null,
  });

  if (isMissingStartDateChangedAtError(error)) {
    await saveDashboardSettingsWithoutChangedAt(userId, settings);
    patchCachedSettings(userId, settings);
    return;
  }

  if (error) throw error;
  patchCachedSettings(userId, settings);
}

export async function saveStartDate(userId: string, value: string) {
  const settings = await loadDashboardSettings(userId);
  await saveDashboardSettings(userId, {
    ...settings,
    startDate: value,
    startDateChangedAt: getTodayIsoDate(),
  });
}

export async function saveLastDeleteDate(userId: string, value: string) {
  const settings = await loadDashboardSettings(userId);
  await saveDashboardSettings(userId, { ...settings, lastDeleteDate: value });
}

export async function loadJournalEntries(userId: string): Promise<JournalEntries> {
  const [entriesResult, { data: tasksData, error: tasksError }, { data: activitiesData, error: activitiesError }] =
    await Promise.all([
      supabase
        .from("dashboard_journal_entries")
        .select("entry_date,morning_feeling,morning_mood,evening_feeling,evening_mood,diary_text")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true })
        .returns<EntryRow[]>(),
      supabase
        .from("dashboard_journal_tasks")
        .select("id,entry_date,position,text,completed,created_at")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true })
        .order("position", { ascending: true })
        .returns<TaskRow[]>(),
      supabase
        .from("dashboard_journal_activities")
        .select("id,entry_date,position,text,status")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true })
        .order("position", { ascending: true })
        .returns<ActivityRow[]>(),
    ]);

  let entriesData = entriesResult.data;
  let entriesError = entriesResult.error;
  if (isMissingDiaryTextError(entriesError)) {
    const fallback = await loadJournalEntriesWithoutDiaryText(userId);
    entriesData = fallback.data;
    entriesError = fallback.error;
  }

  if (entriesError) throw entriesError;
  if (tasksError) throw tasksError;
  if (activitiesError) throw activitiesError;

  const pastOpenTasks = (tasksData ?? []).filter((row) => row.entry_date < getTodayIsoDate() && row.completed === null);
  if (pastOpenTasks.length) {
    const { error } = await supabase.from("dashboard_journal_tasks").upsert(
      pastOpenTasks.map((row) => ({
        completed: false,
        created_at: normalizeCreatedAt(row.created_at),
        entry_date: row.entry_date,
        id: normalizeId(row.id),
        position: row.position ?? 0,
        text: row.text ?? "",
        user_id: userId,
      })),
    );
    if (error) throw error;
  }

  const entries: JournalEntries = {};

  for (const row of entriesData ?? []) {
    entries[row.entry_date] = {
      wants: [],
      morningFeeling: row.morning_feeling ?? "",
      morningMood: normalizeMood(row.morning_mood),
      eveningFeeling: row.evening_feeling ?? "",
      eveningMood: normalizeMood(row.evening_mood),
      activities: [],
      diaryText: row.diary_text ?? "",
    };
  }

  for (const row of tasksData ?? []) {
    const entry = getOrCreateEntry(entries, row.entry_date);
    entry.wants.push({
      id: normalizeId(row.id),
      text: row.text ?? "",
      completed: row.entry_date < getTodayIsoDate() && row.completed === null ? false : row.completed,
      createdAt: normalizeCreatedAt(row.created_at),
    });
  }

  for (const row of activitiesData ?? []) {
    const status = normalizeStatus(row.status);
    if (!status) continue;

    const entry = getOrCreateEntry(entries, row.entry_date);
    entry.activities.push({
      id: normalizeId(row.id),
      text: row.text ?? "",
      status,
    });
  }

  return normalizeEntries(entries);
}

async function loadJournalEntriesWithoutDiaryText(userId: string) {
  return supabase
    .from("dashboard_journal_entries")
    .select("entry_date,morning_feeling,morning_mood,evening_feeling,evening_mood")
    .eq("user_id", userId)
    .order("entry_date", { ascending: true })
    .returns<EntryRow[]>();
}

export async function saveJournalEntry(
  userId: string,
  entryDate: string,
  entry: JournalEntry,
) {
  const normalized = normalizeEntries({ [entryDate]: entry })[entryDate] ?? emptyEntry;
  const queueKey = `${userId}:${entryDate}`;
  const previousSave = journalSaveQueue.get(queueKey) ?? Promise.resolve();
  const nextSave = previousSave
    .catch(() => undefined)
    .then(() => persistJournalEntry(userId, entryDate, normalized));

  journalSaveQueue.set(queueKey, nextSave);

  try {
    await nextSave;
  } finally {
    if (journalSaveQueue.get(queueKey) === nextSave) {
      journalSaveQueue.delete(queueKey);
    }
  }
}

async function persistJournalEntry(
  userId: string,
  entryDate: string,
  normalized: JournalEntry,
) {
  let { error: entryError } = await supabase
    .from("dashboard_journal_entries")
    .upsert({
      user_id: userId,
      entry_date: entryDate,
      morning_feeling: normalized.morningFeeling,
      morning_mood: normalized.morningMood,
      evening_feeling: normalized.eveningFeeling,
      evening_mood: normalized.eveningMood,
      diary_text: normalized.diaryText,
    }, { onConflict: "user_id,entry_date" });

  if (isMissingDiaryTextError(entryError)) {
    const fallback = await supabase
      .from("dashboard_journal_entries")
      .upsert({
        user_id: userId,
        entry_date: entryDate,
        morning_feeling: normalized.morningFeeling,
        morning_mood: normalized.morningMood,
        evening_feeling: normalized.eveningFeeling,
        evening_mood: normalized.eveningMood,
      }, { onConflict: "user_id,entry_date" });
    entryError = fallback.error;
  }

  if (entryError) throw entryError;

  const taskRows = normalized.wants.map((task, position) => ({
    user_id: userId,
    entry_date: entryDate,
    id: normalizeId(task.id),
    position,
    text: task.text,
    completed: task.completed,
    created_at: task.createdAt,
  }));
  const activityRows = normalized.activities.map((activity, position) => ({
    user_id: userId,
    entry_date: entryDate,
    id: normalizeId(activity.id),
    position,
    text: activity.text,
    status: activity.status,
  }));

  if (taskRows.length) {
    const { error } = await supabase
      .from("dashboard_journal_tasks")
      .upsert(taskRows, { onConflict: "user_id,id" });

    if (error) throw error;
  }

  const tasksDeleteError = await deleteStaleJournalRows(
    "dashboard_journal_tasks",
    userId,
    entryDate,
    taskRows.map((row) => row.id),
  );
  if (tasksDeleteError) throw tasksDeleteError;

  if (activityRows.length) {
    const { error } = await supabase
      .from("dashboard_journal_activities")
      .upsert(activityRows, { onConflict: "user_id,id" });

    if (error) throw error;
  }

  const activitiesDeleteError = await deleteStaleJournalRows(
    "dashboard_journal_activities",
    userId,
    entryDate,
    activityRows.map((row) => row.id),
  );
  if (activitiesDeleteError) throw activitiesDeleteError;

  patchCachedJournalEntry(userId, entryDate, normalized);
}

async function deleteStaleJournalRows(
  table: "dashboard_journal_tasks" | "dashboard_journal_activities",
  userId: string,
  entryDate: string,
  currentIds: string[],
) {
  let query = supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .eq("entry_date", entryDate);

  if (currentIds.length) {
    query = query.not("id", "in", `(${currentIds.join(",")})`);
  }

  const { error } = await query;
  return error;
}

export async function deleteJournalEntriesUpTo(userId: string, today: string) {
  const { data, error } = await supabase
    .from("dashboard_journal_entries")
    .delete()
    .eq("user_id", userId)
    .lte("entry_date", today)
    .select("entry_date")
    .returns<Array<{ entry_date: string }>>();

  if (error) throw error;
  removeCachedJournalEntriesUpTo(userId, today);
  return data?.length ?? 0;
}

export async function loadDashboardSnapshot(userId: string, force = false) {
  const cached = snapshotCache.get(userId);
  if (!force && cached && Date.now() - cached.cachedAt < snapshotCacheTtlMs) {
    return cached.snapshot;
  }

  const [settings, entries] = await Promise.all([
    loadDashboardSettings(userId),
    loadJournalEntries(userId),
  ]);

  const snapshot = { settings, entries };
  setCachedDashboardSnapshot(userId, snapshot);

  return snapshot;
}

export function getLatestDashboardSnapshot() {
  return latestSnapshot;
}

export function subscribeDashboardChanges(
  userId: string,
  onChange: () => void,
) {
  const channel = supabase.channel(`dashboard-data-${userId}`);
  const tables = [
    "dashboard_settings",
    "dashboard_journal_entries",
    "dashboard_journal_tasks",
    "dashboard_journal_activities",
  ];

  for (const table of tables) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    );
  }

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function normalizeEntries(entries: JournalEntries) {
  return Object.fromEntries(
    Object.entries(entries).map(([date, entry]) => [
      date,
      {
        wants: normalizeWants(entry?.wants),
        morningFeeling:
          typeof entry?.morningFeeling === "string"
            ? entry.morningFeeling
            : typeof (entry as unknown as { feeling?: unknown })?.feeling ===
                "string"
              ? (entry as unknown as { feeling: string }).feeling
              : "",
        morningMood: normalizeMood(entry?.morningMood),
        eveningFeeling:
          typeof entry?.eveningFeeling === "string" ? entry.eveningFeeling : "",
        eveningMood: normalizeMood(entry?.eveningMood),
        activities: normalizeActivities(entry?.activities),
        diaryText: typeof entry?.diaryText === "string" ? entry.diaryText : "",
      },
    ]),
  );
}

function patchCachedSettings(userId: string, settings: DashboardSettings) {
  const cached = snapshotCache.get(userId);
  if (!cached) return;

  snapshotCache.set(userId, {
    snapshot: { ...cached.snapshot, settings },
    cachedAt: Date.now(),
  });
  latestSnapshot = { ...cached.snapshot, settings };
}

function patchCachedJournalEntry(
  userId: string,
  entryDate: string,
  entry: JournalEntry,
) {
  const cached = snapshotCache.get(userId);
  if (!cached) return;

  const snapshot = {
    ...cached.snapshot,
    entries: {
      ...cached.snapshot.entries,
      [entryDate]: entry,
    },
  };

  setCachedDashboardSnapshot(userId, snapshot);
}

function removeCachedJournalEntriesUpTo(userId: string, today: string) {
  const cached = snapshotCache.get(userId);
  if (!cached) return;

  const snapshot = {
    ...cached.snapshot,
    entries: Object.fromEntries(
      Object.entries(cached.snapshot.entries).filter(([date]) => date > today),
    ),
  };

  setCachedDashboardSnapshot(userId, snapshot);
}

function setCachedDashboardSnapshot(userId: string, snapshot: DashboardSnapshot) {
  latestSnapshot = snapshot;
  snapshotCache.set(userId, { snapshot, cachedAt: Date.now() });
}

async function loadDashboardSettingsWithoutChangedAt(
  userId: string,
): Promise<DashboardSettings> {
  const { data, error } = await supabase
    .from("dashboard_settings")
    .select("start_date,last_delete_date")
    .eq("user_id", userId)
    .maybeSingle<Omit<SettingsRow, "start_date_changed_at">>();

  if (error) return defaultDashboardSettings();
  if (!data) return createDefaultDashboardSettings(userId);

  return {
    startDate: data.start_date ?? getTodayIsoDate(),
    startDateChangedAt: getTodayIsoDate(),
    lastDeleteDate: data.last_delete_date ?? "",
  };
}

async function saveDashboardSettingsWithoutChangedAt(
  userId: string,
  settings: DashboardSettings,
) {
  const { error } = await supabase.from("dashboard_settings").upsert({
    user_id: userId,
    start_date: settings.startDate || null,
    last_delete_date: settings.lastDeleteDate || null,
  });

  if (error) throw error;
}

async function createDefaultDashboardSettings(userId: string) {
  const settings = defaultDashboardSettings();

  try {
    await saveDashboardSettings(userId, settings);
  } catch {
    // Keep the UI usable even if the schema has not been applied yet.
  }

  return settings;
}

function defaultDashboardSettings(): DashboardSettings {
  const today = getTodayIsoDate();

  return {
    startDate: today,
    startDateChangedAt: today,
    lastDeleteDate: "",
  };
}

function isMissingStartDateChangedAtError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("start_date_changed_at")
  );
}

function isMissingDiaryTextError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("diary_text")
  );
}

export function countEntry(entry: JournalEntry | undefined, date = getTodayIsoDate()) {
  if (!entry) return { green: 0, red: 0 };

  return {
    green:
      entry.wants.filter((task) => task.completed === true).length +
      entry.activities.filter(
        (activity) => activity.status === "positive" && activity.text.trim(),
      ).length,
    red:
      entry.wants.filter((task) => task.completed === false).length +
      (date < getTodayIsoDate()
        ? entry.wants.filter((task) => task.completed === null).length
        : 0) +
      entry.activities.filter(
        (activity) => activity.status === "negative" && activity.text.trim(),
      ).length,
  };
}

export function daysBetween(startDate: string, endDate: string) {
  if (!startDate) return 30;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export function getGreenStreak(entries: JournalEntries, today: string) {
  let streak = 0;
  let currentDate = today;

  while (entries[currentDate]) {
    const counts = countEntry(entries[currentDate], currentDate);
    if (counts.green <= counts.red) break;
    streak += 1;
    currentDate = shiftDate(currentDate, -1);
  }

  return streak;
}

function getOrCreateEntry(entries: JournalEntries, entryDate: string) {
  entries[entryDate] ??= { ...emptyEntry, wants: [], activities: [] };
  return entries[entryDate];
}

function normalizeWants(wants: unknown): PlannedTask[] {
  if (!Array.isArray(wants)) return [];

  return wants
    .map((item) => {
      if (typeof item === "string") {
        return {
          id: crypto.randomUUID(),
          text: item,
          completed: null,
          createdAt: new Date().toISOString(),
        };
      }

      if (
        item &&
        typeof item === "object" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        const task = item as Partial<PlannedTask>;
        return {
          id: normalizeId(task.id),
          text: item.text,
          completed:
            task.completed === true || task.completed === false
              ? task.completed
              : null,
          createdAt: normalizeCreatedAt(task.createdAt),
        };
      }

      return null;
    })
    .filter((item): item is PlannedTask => Boolean(item));
}

function normalizeActivities(activities: unknown): Activity[] {
  if (!Array.isArray(activities)) return [];

  return activities
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const activity = item as Partial<Activity>;
      const status = normalizeStatus(activity.status);
      if (typeof activity.text !== "string" || !status) return null;

      return {
        id: normalizeId(activity.id),
        text: activity.text,
        status,
      };
    })
    .filter((item): item is Activity => Boolean(item));
}

function normalizeStatus(value: unknown): ActivityStatus | null {
  if (value === "positive" || value === "negative") {
    return value;
  }

  return null;
}

function normalizeMood(value: unknown): MoodValue | null {
  if (value === "negative" || value === "neutral" || value === "positive") {
    return value;
  }

  return null;
}

function normalizeCreatedAt(value: unknown) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return new Date().toISOString();
}

function normalizeId(value: unknown) {
  if (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }

  return crypto.randomUUID();
}

function shiftDate(date: string, offset: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + offset);
  return [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0"),
  ].join("-");
}
