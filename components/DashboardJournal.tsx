"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { getTodayIsoDate } from "@/lib/date";
import {
  dashboardEvents,
  daysBetween,
  emptyEntry,
  getCurrentUserId,
  getLatestDashboardSnapshot,
  loadDashboardSnapshot,
  migrateLocalDashboardData,
  saveJournalEntry,
  type Activity,
  type ActivityStatus,
  type JournalEntries,
  type JournalEntry,
  type MoodValue,
  type PlannedTask,
  type ProgressRange,
} from "@/lib/dashboard-data";

type JournalTab = "write" | "diary";

export default function DashboardJournal({
  forcedDiaryMode,
  forcedTab,
  hideTabs = false,
  today,
  selectedDate,
}: {
  forcedDiaryMode?: "write" | "feed";
  forcedTab?: JournalTab;
  hideTabs?: boolean;
  today: string;
  selectedDate: string;
}) {
  const [internalActiveTab, setInternalActiveTab] = useState<JournalTab>("write");
  const [internalDiaryMode, setInternalDiaryMode] = useState<"write" | "feed">("write");
  const [newWant, setNewWant] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [newActivityStatus, setNewActivityStatus] =
    useState<ActivityStatus>("positive");
  const [now, setNow] = useState(() => new Date());
  const initialSnapshot = getLatestDashboardSnapshot();
  const [entries, setEntries] = useState<JournalEntries>(
    initialSnapshot?.entries ?? {},
  );
  const [startDate, setStartDate] = useState(
    initialSnapshot?.settings.startDate ?? "",
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(Boolean(initialSnapshot));
  const [syncError, setSyncError] = useState<string | null>(null);
  const activeTab = forcedTab ?? internalActiveTab;
  const diaryMode = forcedDiaryMode ?? internalDiaryMode;

  const isPast = selectedDate < today;
  const isFuture = selectedDate > today;
  const isPlanningLocked =
    selectedDate === today &&
    (now.getHours() > 12 || (now.getHours() === 12 && now.getMinutes() >= 0));
  const entry = entries[selectedDate] ?? emptyEntry;
  const selectedDayLabel = `Day ${startDate ? daysBetween(startDate, selectedDate) : 0}`;
  const diaryEntries = useMemo(
    () => Object.entries(entries)
      .filter(([, item]) => item.diaryText.trim())
      .sort(([left], [right]) => right.localeCompare(left)),
    [entries],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      if (!getLatestDashboardSnapshot()) setLoaded(false);
      setSyncError(null);

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        await migrateLocalDashboardData(currentUserId);
        const snapshot = await loadDashboardSnapshot(currentUserId);
        if (!cancelled) {
          setUserId(currentUserId);
          setEntries(snapshot.entries);
          setStartDate(snapshot.settings.startDate);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSyncError(getErrorMessage());
          setLoaded(true);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function updateEntry(nextEntry: JournalEntry) {
    if (isPast) return;
    setSyncError(null);
    setEntries((current) => ({ ...current, [selectedDate]: nextEntry }));

    if (!userId) return;

    void saveJournalEntry(userId, selectedDate, nextEntry)
      .then(() => {
        setSyncError(null);
        window.dispatchEvent(new Event(dashboardEvents.journal));
      })
      .catch((error) => setSyncError(getErrorMessage(error)));
  }

  function addWant() {
    const text = newWant.trim();
    if (!text || isPast || isPlanningLocked) return;
    updateEntry({
      ...entry,
      wants: [
        ...entry.wants,
        {
          id: crypto.randomUUID(),
          text,
          completed: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setNewWant("");
  }

  function updateWant(id: string, value: string) {
    if (isPlanningLocked) return;
    const next = entry.wants.map((task) =>
      task.id === id ? { ...task, text: value } : task,
    );
    updateEntry({ ...entry, wants: next });
  }

  function removeWant(id: string) {
    if (isPlanningLocked) return;
    updateEntry({
      ...entry,
      wants: entry.wants.filter((task) => task.id !== id),
    });
  }

  function updatePlannedCompletion(id: string, completed: boolean | null) {
    if (isPast || isFuture) return;
    updateEntry({
      ...entry,
      wants: entry.wants.map((task) =>
        task.id === id ? { ...task, completed } : task,
      ),
    });
  }

  function addActivity() {
    const text = newActivity.trim();
    if (!text || isPast) return;
    updateEntry({
      ...entry,
      activities: [
        ...entry.activities,
        { id: crypto.randomUUID(), text, status: newActivityStatus },
      ],
    });
    setNewActivity("");
    setNewActivityStatus("positive");
  }

  function updateActivity(id: string, patch: Partial<Activity>) {
    updateEntry({
      ...entry,
      activities: entry.activities.map((activity) =>
        activity.id === id ? { ...activity, ...patch } : activity,
      ),
    });
  }

  function removeActivity(id: string) {
    updateEntry({
      ...entry,
      activities: entry.activities.filter((activity) => activity.id !== id),
    });
  }

  return (
    <div className="grid gap-4">
      {!loaded ? (
        <div className="surface p-6 text-sm text-site-muted sm:p-8">
          Loading journal...
        </div>
      ) : null}
      {syncError ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {syncError}
        </div>
      ) : null}
      {!hideTabs ? (
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex border border-site bg-site p-1">
            <TabButton
              active={activeTab === "write"}
              label="Journal"
              onClick={() => setInternalActiveTab("write")}
            />
            <TabButton
              active={activeTab === "diary"}
              label="Diary"
              onClick={() => setInternalActiveTab("diary")}
            />
          </div>
          {activeTab === "diary" ? (
            <div className="inline-flex border border-site bg-site p-1">
              <TabButton active={diaryMode === "write"} label="Write" onClick={() => setInternalDiaryMode("write")} />
              <TabButton active={diaryMode === "feed"} label="View" onClick={() => setInternalDiaryMode("feed")} />
            </div>
          ) : null}
        </div>
        <h2 className="flex max-w-full flex-wrap items-baseline gap-3 text-xl font-semibold leading-tight sm:text-2xl">
          <span className="min-w-0 max-w-full wrap-break-word">
            {formatDate(selectedDate)}
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a4772b]">
            {selectedDayLabel}
          </span>
        </h2>
      </section>
      ) : null}

      {activeTab === "write" ? (
        isPast ? (
          <PastDayView entry={entry} />
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            <article className="surface p-6 sm:p-8">
              <p className="eyebrow">Left page</p>
              <h3 className="mt-2 max-w-full wrap-break-word text-2xl font-semibold leading-tight">
                What do I want to do today ?
              </h3>

              <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label="New planned task"
                  className="form-input"
                  value={newWant}
                  onChange={(event) => setNewWant(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addWant();
                  }}
                  placeholder="Add something you want to do"
                  disabled={isPlanningLocked}
                />
                <button
                  type="button"
                  onClick={addWant}
                  disabled={isPlanningLocked}
                  className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {entry.wants.length ? (
                  entry.wants.map((task) => (
                    <div key={task.id}>
                      <JournalTextInput
                        value={task.text}
                        createdAt={task.createdAt}
                        disabled={isPlanningLocked}
                        onChange={(value) => updateWant(task.id, value)}
                        onRemove={() => removeWant(task.id)}
                      />
                    </div>
                  ))
                ) : (
                  <EmptyState text="No intention written for this date yet." />
                )}
              </div>

              <label className="mt-8 block">
                <span className="text-sm font-semibold">
                  How do I feel this morning ?
                </span>
                <textarea
                  aria-label="Morning feeling"
                  className="form-input mt-2 min-h-28 resize-y"
                  value={entry.morningFeeling}
                  onChange={(event) =>
                    updateEntry({ ...entry, morningFeeling: event.target.value })
                  }
                  placeholder="Energy, stress, mood, context..."
                  disabled={isPlanningLocked}
                />
                <MoodPicker
                  value={entry.morningMood}
                  disabled={isPlanningLocked}
                  onChange={(morningMood) =>
                    updateEntry({ ...entry, morningMood })
                  }
                />
              </label>
              {isPlanningLocked ? (
                <p className="mt-4 border border-site bg-site px-3 py-2 text-sm text-site-muted">
                  Left page locked after 12:00.
                </p>
              ) : null}
            </article>

            <article className="surface p-6 sm:p-8">
              <p className="eyebrow">Right page</p>
              <h3 className="mt-2 max-w-full wrap-break-word text-2xl font-semibold leading-tight">
                What did I actually do today ?
              </h3>

              {isFuture ? (
                <FutureRightPage />
              ) : (
                <>
                  {entry.wants.length ? (
                    <div className="mt-6 grid gap-2">
                      <p className="text-sm font-semibold">
                        Confirm planned tasks
                      </p>
                      {entry.wants.map((task) => (
                        <PlannedCompletionItem
                          key={task.id}
                          task={task}
                          onChange={(completed) =>
                            updatePlannedCompletion(task.id, completed)
                          }
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-stretch">
                    <input
                      aria-label="New activity"
                      className="form-input"
                      value={newActivity}
                      onChange={(event) => setNewActivity(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addActivity();
                      }}
                      placeholder="Add an influential activity"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <StatusButton
                        active={newActivityStatus === "positive"}
                        label="Green"
                        tone="positive"
                        onClick={() => setNewActivityStatus("positive")}
                      />
                      <StatusButton
                        active={newActivityStatus === "negative"}
                        label="Red"
                        tone="negative"
                        onClick={() => setNewActivityStatus("negative")}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addActivity}
                      className="btn-primary justify-center"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {entry.activities.length ? (
                      entry.activities.map((activity) => (
                        <ActivityItem
                          key={activity.id}
                          activity={activity}
                          disabled={false}
                          onTextChange={(text) =>
                            updateActivity(activity.id, { text })
                          }
                          onStatusChange={(status) =>
                            updateActivity(activity.id, { status })
                          }
                          onRemove={() => removeActivity(activity.id)}
                        />
                      ))
                    ) : (
                      <EmptyState text="No activity logged for this date yet." />
                    )}
                  </div>

                  <label className="mt-6 block">
                    <span className="text-sm font-semibold">
                      How did I feel today ?
                    </span>
                    <textarea
                      aria-label="End of day feeling"
                      className="form-input mt-2 min-h-24 resize-y"
                      value={entry.eveningFeeling}
                      onChange={(event) =>
                        updateEntry({
                          ...entry,
                          eveningFeeling: event.target.value,
                        })
                      }
                      placeholder="End of day review, energy, confidence, lessons..."
                    />
                    <MoodPicker
                      value={entry.eveningMood}
                      onChange={(eveningMood) =>
                        updateEntry({ ...entry, eveningMood })
                      }
                    />
                  </label>
                </>
              )}
            </article>
          </section>
        )
      ) : activeTab === "diary" ? (
        <DiaryView
          diaryEntries={diaryEntries}
          entry={entry}
          isPast={isPast}
          mode={diaryMode}
          onChange={(diaryText) => updateEntry({ ...entry, diaryText })}
          selectedDate={selectedDate}
        />
      ) : null}
    </div>
  );
}

function JournalTextInput({
  value,
  createdAt,
  disabled,
  onChange,
  onRemove,
}: {
  value: string;
  createdAt: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_40px] gap-2">
      <span className="inline-flex h-11 items-center justify-center border border-site bg-site px-2 text-sm font-semibold text-site-muted">
        {formatTaskTime(createdAt)}
      </span>
      <input
        aria-label="Planned task text"
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="inline-flex h-11 items-center justify-center border border-site text-site-muted transition hover:text-site disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Remove line"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function DiaryView({
  diaryEntries,
  entry,
  isPast,
  mode,
  onChange,
  selectedDate,
}: {
  diaryEntries: Array<[string, JournalEntry]>;
  entry: JournalEntry;
  isPast: boolean;
  mode: "write" | "feed";
  onChange: (value: string) => void;
  selectedDate: string;
}) {
  return (
    <section className="grid gap-4">
      {mode === "write" ? (
        <article className="surface p-6 sm:p-8">
          <p className="eyebrow">Diary</p>
          <h3 className="mt-2 text-2xl font-semibold">{formatDate(selectedDate)}</h3>
          <textarea
            aria-label="Diary text"
            className="form-input mt-5 min-h-[320px] resize-y"
            disabled={isPast}
            value={entry.diaryText}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Insights, thoughts, lessons, ideas..."
          />
          {isPast ? <p className="mt-3 text-sm text-site-muted">Past diary entries are read-only.</p> : null}
        </article>
      ) : (
        <article className="surface p-6 sm:p-8">
          <p className="eyebrow">Diary feed</p>
          <div className="mt-5 grid gap-3">
            {diaryEntries.length ? diaryEntries.map(([date, item]) => (
              <div key={date} className="border border-site bg-card p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#a4772b]">{formatDate(date)}</p>
                <p className="mt-3 whitespace-pre-wrap border-l-4 border-[#d9aa62] bg-site px-4 py-3 text-[0.95rem] leading-7 text-site">{item.diaryText}</p>
              </div>
            )) : <EmptyState text="No diary insight yet." />}
          </div>
        </article>
      )}
    </section>
  );
}

const moodOptions: Array<{
  value: MoodValue;
  emoji: string;
  label: string;
}> = [
  { value: "negative", emoji: "🙁", label: "Unhappy" },
  { value: "neutral", emoji: "😐", label: "Normal" },
  { value: "positive", emoji: "🙂", label: "Happy" },
];

function MoodPicker({
  value,
  disabled,
  onChange,
}: {
  value: MoodValue | null;
  disabled?: boolean;
  onChange: (value: MoodValue | null) => void;
}) {
  return (
    <div className="mt-3 flex gap-2" role="group" aria-label="Mood">
      {moodOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === option.value ? null : option.value)}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center border text-lg transition disabled:cursor-not-allowed disabled:opacity-45",
            value === option.value
              ? "border-[#a4772b] bg-[#f4ecdc]"
              : "border-site bg-card hover:border-[#a4772b]",
          )}
          aria-label={option.label}
          aria-pressed={value === option.value}
        >
          {option.emoji}
        </button>
      ))}
    </div>
  );
}

function ActivityItem({
  activity,
  disabled,
  onTextChange,
  onStatusChange,
  onRemove,
}: {
  activity: Activity;
  disabled: boolean;
  onTextChange: (value: string) => void;
  onStatusChange: (value: ActivityStatus) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 border bg-card p-2.5",
        activity.status === "positive" && "border-emerald-500/45",
        activity.status === "negative" && "border-red-500/45",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_36px] items-center gap-1.5 sm:gap-2">
        <StatusDot status={activity.status} />
        <input
          aria-label="Activity text"
          className="form-input"
          value={activity.text}
          onChange={(event) => onTextChange(event.target.value)}
          disabled={disabled}
        />
        <StatusButton
          active={activity.status === "positive"}
          label="Green"
          tone="positive"
          disabled={disabled}
          onClick={() => onStatusChange("positive")}
        />
        <StatusButton
          active={activity.status === "negative"}
          label="Red"
          tone="negative"
          disabled={disabled}
          onClick={() => onStatusChange("negative")}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex h-9 items-center justify-center border border-site text-site-muted transition hover:text-site disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remove activity"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function PlannedCompletionItem({
  task,
  onChange,
}: {
  task: PlannedTask;
  onChange: (completed: boolean | null) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 border bg-card p-2.5",
        task.completed === true && "border-emerald-500/45",
        task.completed === false && "border-red-500/45",
        task.completed === null && "border-site",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        {task.completed === null ? (
          <span
            className="h-3 w-3 rounded-full border border-site"
            aria-hidden="true"
          />
        ) : (
          <StatusDot status={task.completed ? "positive" : "negative"} />
        )}
        <p className="min-w-0 text-sm leading-5">
          <span className="mr-2 font-semibold text-site-muted">
            {formatTaskTime(task.createdAt)}
          </span>
          {task.text}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <StatusIconButton
            active={task.completed === true}
            tone="positive"
            ariaLabel="Mark as done"
            onClick={() => onChange(true)}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </StatusIconButton>
          <StatusIconButton
            active={task.completed === false}
            tone="negative"
            ariaLabel="Mark as missed"
            onClick={() => onChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </StatusIconButton>
        </div>
      </div>
    </div>
  );
}

function StatusIconButton({
  active,
  tone,
  ariaLabel,
  onClick,
  children,
}: {
  active: boolean;
  tone: ActivityStatus;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const activeClasses = {
    positive: "border-emerald-600 bg-emerald-50 text-emerald-800",
    negative: "border-red-600 bg-red-50 text-red-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center border transition",
        active ? activeClasses[tone] : "border-site text-site-muted hover:text-site",
      )}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: ActivityStatus }) {
  return (
    <span
      className={cn(
        "h-3 w-3 rounded-full",
        status === "positive" && "bg-emerald-500",
        status === "negative" && "bg-red-500",
      )}
      aria-hidden="true"
    />
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-site bg-site p-4 text-sm text-site-muted">
      {text}
    </div>
  );
}

function FutureRightPage() {
  return (
    <div className="mt-8 border border-dashed border-site bg-site p-5">
      <p className="text-sm font-semibold">Available on the selected day.</p>
      <p className="mt-2 text-sm leading-6 text-site-muted">
        The right page is for logging what actually happened, so it opens when
        that date arrives.
      </p>
    </div>
  );
}

function PastDayView({ entry }: { entry: JournalEntry }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="surface p-6 sm:p-8">
        <p className="eyebrow">Left page</p>
        <h3 className="mt-2 max-w-full wrap-break-word text-2xl font-semibold leading-tight">
          Wanted to do
        </h3>
        <div className="mt-6 grid gap-2">
          {entry.wants.length ? (
            entry.wants.map((task) => (
              <div key={task.id} className="fp-panel p-4">
                <p className="text-sm leading-6">
                  <span className="mr-2 font-semibold text-site-muted">
                    {formatTaskTime(task.createdAt)}
                  </span>
                  {task.text}
                </p>
              </div>
            ))
          ) : (
            <EmptyState text="No intention was written for this date." />
          )}
        </div>
        {entry.morningFeeling ? (
          <div className="mt-8 border border-site bg-site p-4">
            <p className="text-sm font-semibold">Morning feeling</p>
            <p className="mt-2 text-sm leading-6 text-site-muted">
              {entry.morningFeeling}
            </p>
            {entry.morningMood ? (
              <p className="mt-3 text-xl" aria-label="Morning mood">
                {getMoodEmoji(entry.morningMood)}
              </p>
            ) : null}
          </div>
        ) : entry.morningMood ? (
          <div className="mt-8 border border-site bg-site p-4">
            <p className="text-sm font-semibold">Morning feeling</p>
            <p className="mt-3 text-xl" aria-label="Morning mood">
              {getMoodEmoji(entry.morningMood)}
            </p>
          </div>
        ) : null}
      </article>

      <article className="surface p-6 sm:p-8">
        <p className="eyebrow">Right page</p>
        <h3 className="mt-2 max-w-full wrap-break-word text-2xl font-semibold leading-tight">
          Done
        </h3>
        <div className="mt-8 grid gap-3">
          {entry.wants.map((task) => (
            <div
              key={task.id}
              className={cn(
                "grid grid-cols-[auto_1fr] items-center gap-2 border bg-card p-2.5",
                task.completed === true && "border-emerald-500/45",
                task.completed === false && "border-red-500/45",
                task.completed === null && "border-site",
              )}
            >
              {task.completed === null ? (
                <span
                  className="h-3 w-3 rounded-full border border-site"
                  aria-hidden="true"
                />
              ) : (
                <StatusDot status={task.completed ? "positive" : "negative"} />
              )}
              <p className="text-sm leading-5">
                <span className="mr-2 font-semibold text-site-muted">
                  {formatTaskTime(task.createdAt)}
                </span>
                {task.text}
              </p>
            </div>
          ))}
          {entry.activities.length ? (
            entry.activities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  "grid grid-cols-[auto_1fr] items-center gap-2 border bg-card p-2.5",
                  activity.status === "positive" && "border-emerald-500/45",
                  activity.status === "negative" && "border-red-500/45",
                )}
              >
                <StatusDot status={activity.status} />
                <p className="text-sm leading-5">{activity.text}</p>
              </div>
            ))
          ) : entry.wants.length ? null : (
            <EmptyState text="No activity was logged for this date." />
          )}
        </div>
        {entry.eveningFeeling ? (
          <div className="mt-6 border border-site bg-site p-3">
            <p className="text-sm font-semibold">End of day feeling</p>
            <p className="mt-2 text-sm leading-5 text-site-muted">
              {entry.eveningFeeling}
            </p>
            {entry.eveningMood ? (
              <p className="mt-3 text-xl" aria-label="End of day mood">
                {getMoodEmoji(entry.eveningMood)}
              </p>
            ) : null}
          </div>
        ) : entry.eveningMood ? (
          <div className="mt-6 border border-site bg-site p-3">
            <p className="text-sm font-semibold">End of day feeling</p>
            <p className="mt-3 text-xl" aria-label="End of day mood">
              {getMoodEmoji(entry.eveningMood)}
            </p>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function StatusButton({
  active,
  label,
  tone,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: ActivityStatus;
  disabled?: boolean;
  onClick: () => void;
}) {
  const activeClasses = {
    positive: "border-emerald-600 bg-emerald-50 text-emerald-800",
    negative: "border-red-600 bg-red-50 text-red-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "border px-2.5 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        active ? activeClasses[tone] : "border-site text-site-muted hover:text-site",
      )}
    >
      {label}
    </button>
  );
}

function countDay(entry: JournalEntry, date: string) {
  const plannedGreen = entry.wants.filter((task) => task.completed === true).length;
  const plannedRed =
    entry.wants.filter((task) => task.completed === false).length +
    (date < getTodayIsoDate()
      ? entry.wants.filter((task) => task.completed === null).length
      : 0);

  return {
    positive:
      plannedGreen +
      entry.activities.filter(
        (activity) => activity.status === "positive" && activity.text.trim(),
      ).length,
    negative:
      plannedRed +
      entry.activities.filter(
        (activity) => activity.status === "negative" && activity.text.trim(),
      ).length,
  };
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm font-semibold transition",
        active ? "bg-ink text-white" : "text-site-muted hover:text-site",
      )}
    >
      {label}
    </button>
  );
}

function ProgressMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="fp-panel p-4">
      <p className="text-2xl font-semibold">
        {value}
        {suffix}
      </p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-site-muted">
        {label}
      </p>
    </div>
  );
}

function LineTrendChart({
  buckets,
  max,
}: {
  buckets: ReturnType<typeof getBuckets>;
  max: number;
}) {
  const width = 1000;
  const height = 190;
  const paddingX = 40;
  const top = 14;
  const chartHeight = 126;
  const labelY = 168;
  const series = [
    { key: "positive", color: "#10b981" },
    { key: "negative", color: "#ef4444" },
  ] as const;

  function point(value: number, index: number) {
    const x =
      buckets.length === 1
        ? width / 2
        : paddingX + (index / (buckets.length - 1)) * (width - paddingX * 2);
    const y = top + chartHeight - (value / max) * chartHeight;
    return { x, y };
  }

  function points(key: (typeof series)[number]["key"]) {
    return buckets
      .map((bucket, index) => {
        const current = point(bucket[key], index);
        return `${current.x},${current.y}`;
      })
      .join(" ");
  }

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend line chart"
      >
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={top + chartHeight}
          y2={top + chartHeight}
          stroke="rgba(18,18,18,0.12)"
        />
        {series.map((item) => (
          <polyline
            key={item.key}
            fill="none"
            points={points(item.key)}
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        ))}
        {series.map((item) =>
          buckets.map((bucket, index) => {
            const current = point(bucket[item.key], index);
            return (
              <circle
                key={`${item.key}-${bucket.key}`}
                cx={current.x}
                cy={current.y}
                fill={item.color}
                r="3.5"
              />
            );
          }),
        )}
        {buckets.map((bucket, index) => {
          const shouldShowLabel =
            buckets.length <= 12 ||
            index === 0 ||
            index === buckets.length - 1 ||
            index % 5 === 0;
          if (!shouldShowLabel) return null;

          const current = point(0, index);
          return (
            <text
              key={bucket.key}
              x={current.x}
              y={labelY}
              fill="rgba(18,18,18,0.62)"
              fontSize="11"
              fontWeight="400"
              textAnchor="middle"
            >
              {bucket.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}

function buildProgress(
  entries: JournalEntries,
  selectedDate: string,
  range: ProgressRange,
) {
  const buckets = getBuckets(selectedDate, range);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const [date, entry] of Object.entries(entries)) {
    const bucketKey = getBucketKey(date, range);
    const bucket = bucketMap.get(bucketKey);
    if (!bucket) continue;

    const counts = countDay(entry, date);
    bucket.positive += counts.positive;
    bucket.negative += counts.negative;
    bucket.planned += entry.wants.length;
    bucket.completed += entry.wants.filter((task) => task.completed === true).length;
  }

  const totals = buckets.reduce(
    (total, bucket) => ({
      positive: total.positive + bucket.positive,
      negative: total.negative + bucket.negative,
      planned: total.planned + bucket.planned,
      completed: total.completed + bucket.completed,
    }),
    { positive: 0, negative: 0, planned: 0, completed: 0 },
  );

  return {
    buckets,
    totals,
    conversion: totals.planned
      ? Math.round((totals.completed / totals.planned) * 100)
      : 0,
    maxBucketValue: Math.max(
      1,
      ...buckets.map((bucket) =>
        Math.max(bucket.positive, bucket.negative),
      ),
    ),
  };
}

function getBuckets(selectedDate: string, range: ProgressRange) {
  if (range === "week") {
    const weekStart = getWeekStart(selectedDate);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = shiftDate(weekStart, index);
      return emptyBucket(date, weekdayWithDay(date));
    });
  }

  if (range === "month") {
    const monthStart = getMonthStart(selectedDate);
    const totalDays = getDaysInMonth(selectedDate);

    return Array.from({ length: totalDays }).map((_, index) => {
      const date = shiftDate(monthStart, index);
      return emptyBucket(date, String(index + 1));
    });
  }

  return Array.from({ length: 12 }).map((_, index) => {
    const date = shiftMonth(selectedDate, index - 11);
    return emptyBucket(getBucketKey(date, range), shortMonth(date));
  });
}

function emptyBucket(key: string, label: string) {
  return {
    key,
    label,
    positive: 0,
    negative: 0,
    planned: 0,
    completed: 0,
  };
}

function getBucketKey(date: string, range: ProgressRange) {
  if (range === "week" || range === "month") return date;

  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekStart(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const mondayOffset = (parsed.getDay() + 6) % 7;
  parsed.setDate(parsed.getDate() - mondayOffset);
  return toIsoDate(parsed);
}

function getMonthStart(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDaysInMonth(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
}

function shiftDate(date: string, offset: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + offset);
  return toIsoDate(nextDate);
}

function shiftMonth(date: string, offset: number) {
  const current = new Date(`${date}T00:00:00`);
  const shifted = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  const lastDay = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0,
  ).getDate();
  shifted.setDate(Math.min(current.getDate(), lastDay));
  return toIsoDate(shifted);
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function weekdayWithDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    parsed,
  );
  return `${weekday} ${parsed.getDate()}`;
}

function shortMonth(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(`${date}T00:00:00`),
  );
}

void ProgressMetric;
void LineTrendChart;
void LegendDot;
void buildProgress;

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    parsed,
  );
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    parsed,
  );
  const day = parsed.getDate();
  const year = parsed.getFullYear();

  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) return "th";
  const lastDigit = day % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}

function formatTaskTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).format(date);
}

function getMoodEmoji(value: MoodValue) {
  return moodOptions.find((option) => option.value === value)?.emoji ?? "";
}

function getErrorMessage(error?: unknown) {
  const message = getErrorText(error).toLowerCase();
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("proxy") ||
    message.includes("err_proxy") ||
    message.includes("load failed")
  ) {
    return "Sync failed. Supabase could not be reached. Check proxy/VPN/network and try again.";
  }

  return "Sync failed. Please refresh the page or check the dashboard schema.";
}

function getErrorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}
