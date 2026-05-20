"use client";

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FileImage,
  Film,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Loader2,
  PanelLeft,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { getCurrentUserId } from "@/lib/dashboard-data";
import {
  createPlaybookChapter,
  createPlaybookCourse,
  createPlaybookItem,
  createPlaybookModule,
  deletePlaybookChapter,
  deletePlaybookCourse,
  deletePlaybookItem,
  deletePlaybookModule,
  getLinkItemType,
  getYouTubeEmbedUrl,
  loadPlaybooks,
  updatePlaybookChapter,
  updatePlaybookCourse,
  updatePlaybookItemNotes,
  updatePlaybookModule,
  uploadPlaybookCover,
  uploadPlaybookFile,
  type PlaybookChapter,
  type PlaybookCourse,
  type PlaybookItem,
  type PlaybookItemType,
  type PlaybookModule,
} from "@/lib/playbooks-data";

type ViewMode = "cards" | "list" | "split";
type CardKind = "chapter" | "course" | "module";
type CardStat = {
  label: string;
  value?: string;
};
type ModalState =
  | { kind: "course"; mode: "create" }
  | { kind: "course"; mode: "edit"; item: PlaybookCourse }
  | { kind: "module"; mode: "create" }
  | { kind: "module"; mode: "edit"; item: PlaybookModule }
  | { kind: "chapter"; mode: "create" }
  | { kind: "chapter"; mode: "edit"; item: PlaybookChapter }
  | null;

type CardEntry = {
  coverPath: string | null;
  coverUrl: string;
  description: string;
  id: string;
  kind: CardKind;
  onEdit: () => void;
  onOpen: () => void;
  stats: CardStat[];
  title: string;
};

type CardFormValues = {
  coverFile: File | null;
  coverPath: string | null;
  description: string;
  title: string;
};

export default function DashboardPlaybooks() {
  const [courses, setCourses] = useState<PlaybookCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId),
    [courseId, courses],
  );
  const selectedModule = useMemo(
    () => selectedCourse?.modules.find((module) => module.id === moduleId),
    [moduleId, selectedCourse],
  );
  const selectedChapter = useMemo(
    () => selectedModule?.chapters.find((chapter) => chapter.id === chapterId),
    [chapterId, selectedModule],
  );
  const actionKind: CardKind = !selectedCourse ? "course" : !selectedModule ? "module" : "chapter";
  const actionLabel = `Add ${actionKind}`;
  const countLabel = !selectedCourse
    ? `${courses.length} courses`
    : !selectedModule
      ? `${selectedCourse.modules.length} modules`
      : !selectedChapter
        ? `${selectedModule.chapters.length} chapters`
        : `${selectedChapter.items.length} items`;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        const nextCourses = await loadPlaybooks(currentUserId);
        if (!cancelled) {
          setUserId(currentUserId);
          setCourses(nextCourses);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSyncError(getSchemaMessage());
          setLoaded(true);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    if (!userId) return;
    setCourses(await loadPlaybooks(userId));
  }

  async function runSync(action: () => Promise<void>) {
    if (!userId) return;
    setSyncError(null);
    setSyncing(true);
    try {
      await action();
      await refresh();
    } catch {
      setSyncError(getSchemaMessage());
    } finally {
      setSyncing(false);
    }
  }

  async function resolveCoverPath(values: CardFormValues) {
    if (!userId || !values.coverFile) return values.coverPath;
    return uploadPlaybookCover(userId, values.coverFile);
  }

  function handleSubmitCard(values: CardFormValues) {
    if (!modalState) return;
    const title = values.title.trim();
    if (!title) return;

    void runSync(async () => {
      const coverPath = await resolveCoverPath(values);

      if (modalState.kind === "course" && modalState.mode === "create") {
        await createPlaybookCourse(userId!, {
          category: "COURSE",
          coverPath,
          description: values.description.trim(),
          position: courses.length,
          title,
        });
      }

      if (modalState.kind === "course" && modalState.mode === "edit") {
        await updatePlaybookCourse(userId!, modalState.item.id, {
          coverPath,
          description: values.description.trim(),
          title,
        });
      }

      if (modalState.kind === "module" && modalState.mode === "create" && selectedCourse) {
        await createPlaybookModule(userId!, {
          courseId: selectedCourse.id,
          coverPath,
          position: selectedCourse.modules.length,
          title,
        });
      }

      if (modalState.kind === "module" && modalState.mode === "edit") {
        await updatePlaybookModule(userId!, modalState.item.id, { coverPath, title });
      }

      if (modalState.kind === "chapter" && modalState.mode === "create" && selectedModule) {
        await createPlaybookChapter(userId!, {
          coverPath,
          moduleId: selectedModule.id,
          position: selectedModule.chapters.length,
          title,
        });
      }

      if (modalState.kind === "chapter" && modalState.mode === "edit") {
        await updatePlaybookChapter(userId!, modalState.item.id, { coverPath, title });
      }

      setModalState(null);
    });
  }

  function handleDeleteCard() {
    if (!modalState || modalState.mode !== "edit") return;
    const confirmed = window.confirm(`Delete "${modalState.item.title}" and all its content?`);
    if (!confirmed) return;

    void runSync(async () => {
      if (modalState.kind === "course") {
        await deletePlaybookCourse(userId!, modalState.item.id);
        if (courseId === modalState.item.id) {
          setCourseId("");
          setModuleId("");
          setChapterId("");
        }
      }

      if (modalState.kind === "module") {
        await deletePlaybookModule(userId!, modalState.item.id);
        if (moduleId === modalState.item.id) {
          setModuleId("");
          setChapterId("");
        }
      }

      if (modalState.kind === "chapter") {
        await deletePlaybookChapter(userId!, modalState.item.id);
        if (chapterId === modalState.item.id) setChapterId("");
      }

      setModalState(null);
    });
  }

  function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChapter) return;
    const sourceUrl = linkValue.trim();
    if (!sourceUrl) return;
    const type = getLinkItemType(sourceUrl);

    void runSync(async () => {
      await createPlaybookItem(userId!, {
        chapterId: selectedChapter.id,
        position: selectedChapter.items.length,
        sourceUrl,
        title: linkTitle.trim() || getDefaultItemTitle(type),
        type,
      });
      setLinkValue("");
      setLinkTitle("");
    });
  }

  function handleCreateTextItem(title: string, notes: string) {
    if (!selectedChapter) return;
    const textTitle = title.trim();
    const textNotes = notes.trim();
    if (!textTitle && !textNotes) return;

    void runSync(async () => {
      await createPlaybookItem(userId!, {
        chapterId: selectedChapter.id,
        notes: textNotes,
        position: selectedChapter.items.length,
        title: textTitle || "Text notes",
        type: "text",
      });
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!selectedChapter) return;
    void uploadFiles(Array.from(event.dataTransfer.files), selectedChapter);
  }

  async function uploadFiles(files: File[], chapter: PlaybookChapter) {
    if (!files.length) return;

    await runSync(async () => {
      for (const [index, file] of files.entries()) {
        const uploaded = await uploadPlaybookFile(userId!, file);
        await createPlaybookItem(userId!, {
          chapterId: chapter.id,
          mimeType: uploaded.mimeType,
          position: chapter.items.length + index,
          storagePath: uploaded.path,
          title: uploaded.originalName,
          type: uploaded.type,
        });
      }
    });
  }

  const courseCards = courses.map((course): CardEntry => ({
    coverPath: course.coverPath,
    coverUrl: course.coverUrl,
    description: course.description || "No description yet.",
    id: course.id,
    kind: "course",
    onEdit: () => setModalState({ kind: "course", mode: "edit", item: course }),
    onOpen: () => {
      setCourseId(course.id);
      setModuleId("");
      setChapterId("");
    },
    stats: [
      { label: "Modules", value: String(course.modules.length) },
      { label: "Chapters", value: String(countCourseChapters(course)) },
      { label: "Items", value: String(countCourseItems(course)) },
    ],
    title: course.title,
  }));
  const moduleCards = (selectedCourse?.modules ?? []).map((module): CardEntry => ({
    coverPath: module.coverPath,
    coverUrl: module.coverUrl,
    description: `${module.chapters.length} chapters in ${selectedCourse?.title ?? "course"}`,
    id: module.id,
    kind: "module",
    onEdit: () => setModalState({ kind: "module", mode: "edit", item: module }),
    onOpen: () => {
      setModuleId(module.id);
      setChapterId("");
    },
    stats: [
      { label: "Chapters", value: String(module.chapters.length) },
      { label: "Items", value: String(countModuleItems(module)) },
      { label: "Module" },
    ],
    title: module.title,
  }));
  const chapterCards = (selectedModule?.chapters ?? []).map((chapter): CardEntry => ({
    coverPath: chapter.coverPath,
    coverUrl: chapter.coverUrl,
    description: "Chapter",
    id: chapter.id,
    kind: "chapter",
    onEdit: () => setModalState({ kind: "chapter", mode: "edit", item: chapter }),
    onOpen: () => setChapterId(chapter.id),
    stats: [
      { label: "Items", value: String(chapter.items.length) },
      { label: "Text", value: String(chapter.items.filter((entry) => entry.type === "text").length) },
      { label: "Chapter" },
    ],
    title: chapter.title,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="flex flex-wrap items-start justify-between gap-3 border-b border-site px-3 py-3 sm:px-5">
        <div>
          <Breadcrumbs
            course={selectedCourse}
            module={selectedModule}
            chapter={selectedChapter}
            onAllCourses={() => {
              setCourseId("");
              setModuleId("");
              setChapterId("");
            }}
            onCourse={() => {
              setModuleId("");
              setChapterId("");
            }}
            onModule={() => setChapterId("")}
          />
          <p className="mt-2 text-sm font-semibold text-site-muted">{countLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin text-site-muted" aria-hidden="true" /> : null}
          <ViewModeControls value={viewMode} onChange={setViewMode} />
          <button
            type="button"
            className="btn-primary bg-ink text-white"
            onClick={() => setModalState({ kind: actionKind, mode: "create" } as ModalState)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </button>
        </div>
      </section>

      {syncError ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {syncError}
        </div>
      ) : null}

      {!loaded ? (
        <div className="surface flex-1 p-6 text-sm text-site-muted">Loading playbooks...</div>
      ) : (
        <div className={treeCollapsed ? "grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[56px_1fr]" : "grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[280px_1fr]"}>
          <PlaybooksTreeNav
            collapsed={treeCollapsed}
            courses={courses}
            onSelectChapter={(nextCourseId, nextModuleId, nextChapterId) => {
              setCourseId(nextCourseId);
              setModuleId(nextModuleId);
              setChapterId(nextChapterId);
            }}
            onSelectCourse={(nextCourseId) => {
              setCourseId(nextCourseId);
              setModuleId("");
              setChapterId("");
            }}
            onSelectModule={(nextCourseId, nextModuleId) => {
              setCourseId(nextCourseId);
              setModuleId(nextModuleId);
              setChapterId("");
            }}
            onToggle={() => setTreeCollapsed((value) => !value)}
            selectedChapterId={chapterId}
            selectedCourseId={courseId}
            selectedModuleId={moduleId}
          />
          <div className="min-h-0 min-w-0 overflow-y-auto p-3 sm:p-5">
            {!selectedCourse ? (
              <CardBrowser
                entries={courseCards}
                emptyText="Add your first playbook course."
                renderSplit={(course) => {
                  const target = courses.find((item) => item.id === course.id);
                  return (
                    <CardBrowser
                      entries={(target?.modules ?? []).map((module): CardEntry => ({
                        coverPath: module.coverPath,
                        coverUrl: module.coverUrl,
                        description: `${module.chapters.length} chapters`,
                        id: module.id,
                        kind: "module",
                        onEdit: () => setModalState({ kind: "module", mode: "edit", item: module }),
                        onOpen: () => {
                          setCourseId(course.id);
                          setModuleId(module.id);
                          setChapterId("");
                        },
                        stats: [
                          { label: "Chapters", value: String(module.chapters.length) },
                          { label: "Items", value: String(countModuleItems(module)) },
                          { label: "Module" },
                        ],
                        title: module.title,
                      }))}
                      emptyText="No module in this course."
                      viewMode="list"
                    />
                  );
                }}
                viewMode={viewMode}
              />
            ) : !selectedModule ? (
              <CardBrowser
                entries={moduleCards}
                emptyText="Add the first module."
                renderSplit={(module) => {
                  const target = selectedCourse.modules.find((item) => item.id === module.id);
                  return (
                    <CardBrowser
                      entries={(target?.chapters ?? []).map((chapter): CardEntry => ({
                        coverPath: chapter.coverPath,
                        coverUrl: chapter.coverUrl,
                        description: "Chapter",
                        id: chapter.id,
                        kind: "chapter",
                        onEdit: () => setModalState({ kind: "chapter", mode: "edit", item: chapter }),
                        onOpen: () => {
                          setModuleId(module.id);
                          setChapterId(chapter.id);
                        },
                        stats: [
                          { label: "Items", value: String(chapter.items.length) },
                          { label: "Text", value: String(chapter.items.filter((entry) => entry.type === "text").length) },
                          { label: "Chapter" },
                        ],
                        title: chapter.title,
                      }))}
                      emptyText="No chapter in this module."
                      viewMode="list"
                    />
                  );
                }}
                viewMode={viewMode}
              />
            ) : !selectedChapter ? (
              <CardBrowser
                entries={chapterCards}
                emptyText="Add the first chapter."
                renderSplit={(chapter) => {
                  const target = selectedModule.chapters.find((item) => item.id === chapter.id);
                  return target ? (
                    <ChapterWorkspace
                      chapter={target}
                      linkTitle={linkTitle}
                      linkValue={linkValue}
                      onCreateLink={handleCreateLink}
                      onCreateTextItem={handleCreateTextItem}
                      onDeleteItem={(item) => void runSync(() => deletePlaybookItem(userId!, item))}
                      onDrop={handleDrop}
                      onFileSelect={(files) => void uploadFiles(files, target)}
                      onLinkTitleChange={setLinkTitle}
                      onLinkValueChange={setLinkValue}
                      onSaveNotes={(item, notes) => void runSync(() => updatePlaybookItemNotes(userId!, item.id, notes))}
                      syncing={syncing}
                    />
                  ) : null;
                }}
                viewMode={viewMode}
              />
            ) : (
              <ChapterWorkspace
                chapter={selectedChapter}
                linkTitle={linkTitle}
                linkValue={linkValue}
                onCreateLink={handleCreateLink}
                onCreateTextItem={handleCreateTextItem}
                onDeleteItem={(item) => void runSync(() => deletePlaybookItem(userId!, item))}
                onDrop={handleDrop}
                onFileSelect={(files) => void uploadFiles(files, selectedChapter)}
                onLinkTitleChange={setLinkTitle}
                onLinkValueChange={setLinkValue}
                onSaveNotes={(item, notes) => void runSync(() => updatePlaybookItemNotes(userId!, item.id, notes))}
                syncing={syncing}
              />
            )}
          </div>
        </div>
      )}

      {modalState ? (
        <CardModal
          state={modalState}
          onClose={() => setModalState(null)}
          onDelete={handleDeleteCard}
          onSubmit={handleSubmitCard}
          syncing={syncing}
        />
      ) : null}
    </div>
  );
}

function Breadcrumbs({
  chapter,
  course,
  module,
  onAllCourses,
  onCourse,
  onModule,
}: {
  chapter: PlaybookChapter | undefined;
  course: PlaybookCourse | undefined;
  module: PlaybookModule | undefined;
  onAllCourses: () => void;
  onCourse: () => void;
  onModule: () => void;
}) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-site-muted" aria-label="Playbook navigation">
      <button type="button" className="transition hover:text-site" onClick={onAllCourses}>
        All courses
      </button>
      {course ? (
        <>
          <span>/</span>
          <button type="button" className="max-w-52 truncate transition hover:text-site" onClick={onCourse}>
            {course.title}
          </button>
        </>
      ) : null}
      {module ? (
        <>
          <span>/</span>
          <button type="button" className="max-w-52 truncate transition hover:text-site" onClick={onModule}>
            {module.title}
          </button>
        </>
      ) : null}
      {chapter ? (
        <>
          <span>/</span>
          <span className="max-w-52 truncate text-site">{chapter.title}</span>
        </>
      ) : null}
    </nav>
  );
}

function PlaybooksTreeNav({
  collapsed,
  courses,
  onSelectChapter,
  onSelectCourse,
  onSelectModule,
  onToggle,
  selectedChapterId,
  selectedCourseId,
  selectedModuleId,
}: {
  collapsed: boolean;
  courses: PlaybookCourse[];
  onSelectChapter: (courseId: string, moduleId: string, chapterId: string) => void;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (courseId: string, moduleId: string) => void;
  onToggle: () => void;
  selectedChapterId: string;
  selectedCourseId: string;
  selectedModuleId: string;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-site bg-card">
      <div className={collapsed ? "flex justify-center border-b border-site p-2" : "flex items-center justify-between gap-3 border-b border-site px-4 py-3"}>
        {!collapsed ? (
          <p className="eyebrow text-site-muted">Library</p>
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-site bg-site text-site-muted transition hover:text-site"
          onClick={onToggle}
          aria-label={collapsed ? "Expand playbooks navigation" : "Collapse playbooks navigation"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {courses.length ? courses.map((course) => (
            <div key={course.id} className="grid border-b border-site py-1 last:border-b-0">
              <button
                type="button"
                className={selectedCourseId === course.id && !selectedModuleId ? "border border-ink bg-ink px-3 py-2.5 text-left text-sm font-semibold text-white" : "border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-site transition hover:border-site hover:bg-site"}
                onClick={() => onSelectCourse(course.id)}
              >
                {course.title}
              </button>
              {course.modules.map((module) => (
                <div key={module.id} className="grid">
                  <button
                    type="button"
                    className={selectedModuleId === module.id && !selectedChapterId ? "ml-3 border border-ink bg-ink px-3 py-2 text-left text-sm font-semibold text-white" : "ml-3 border border-transparent px-3 py-2 text-left text-sm text-site-muted transition hover:border-site hover:bg-site hover:text-site"}
                    onClick={() => onSelectModule(course.id, module.id)}
                  >
                    {module.title}
                  </button>
                  {module.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      className={selectedChapterId === chapter.id ? "ml-6 border border-ink bg-ink px-3 py-2 text-left text-xs font-semibold text-white" : "ml-6 border border-transparent px-3 py-2 text-left text-xs text-site-muted transition hover:border-site hover:bg-site hover:text-site"}
                      onClick={() => onSelectChapter(course.id, module.id, chapter.id)}
                    >
                      {chapter.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )) : (
            <EmptyState text="No course yet." />
          )}
        </div>
      ) : null}
    </aside>
  );
}

function ViewModeControls({ onChange, value }: { onChange: (value: ViewMode) => void; value: ViewMode }) {
  const items: Array<{ icon: typeof LayoutGrid; label: string; value: ViewMode }> = [
    { icon: LayoutGrid, label: "Cards view", value: "cards" },
    { icon: List, label: "List view", value: "list" },
    { icon: PanelLeft, label: "Split view", value: "split" },
  ];

  return (
    <div className="inline-flex border border-site bg-card p-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            className={value === item.value ? "bg-ink p-2 text-white" : "p-2 text-site-muted transition hover:text-site"}
            onClick={() => onChange(item.value)}
            aria-label={item.label}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function CardBrowser({
  emptyText,
  entries,
  renderSplit,
  viewMode,
}: {
  emptyText: string;
  entries: CardEntry[];
  renderSplit?: (entry: CardEntry) => React.ReactNode;
  viewMode: ViewMode;
}) {
  const [previewId, setPreviewId] = useState(entries[0]?.id ?? "");
  const preview = entries.find((entry) => entry.id === previewId) ?? entries[0];

  if (!entries.length) return <EmptyState text={emptyText} />;

  if (viewMode === "split") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid content-start gap-3">
          {entries.map((entry) => (
            <PlaybookCard
              key={entry.id}
              compact
              entry={entry}
              onClick={() => setPreviewId(entry.id)}
              onDoubleClick={entry.onOpen}
            />
          ))}
        </div>
        <div
          className="min-w-0 border-t border-site pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0"
          onDoubleClick={(event) => {
            if (event.target === event.currentTarget) preview?.onOpen();
          }}
        >
          {preview && renderSplit ? renderSplit(preview) : <EmptyState text="No preview available." />}
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="grid gap-2">
        {entries.map((entry) => (
          <PlaybookListItem key={entry.id} entry={entry} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {entries.map((entry) => (
        <PlaybookCard key={entry.id} entry={entry} onClick={entry.onOpen} />
      ))}
    </div>
  );
}

function formatCardStats(stats: CardStat[]) {
  return stats.map((stat) => (stat.value ? `${stat.value} ${stat.label}` : stat.label)).join(" / ");
}

function PlaybookStatBadge({ stat }: { stat: CardStat }) {
  return (
    <span className="grid min-h-14 min-w-0 place-content-center border border-site bg-white/54 px-1.5 py-2 text-center leading-none">
      {stat.value ? (
        <span className="block text-base font-semibold tabular-nums leading-none text-site">{stat.value}</span>
      ) : null}
      <span className="mt-1 block whitespace-nowrap text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-site-muted">
        {stat.label}
      </span>
    </span>
  );
}

function PlaybookCard({
  compact = false,
  entry,
  onClick,
  onDoubleClick,
}: {
  compact?: boolean;
  entry: CardEntry;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="relative grid min-h-52 w-full content-between gap-4 overflow-hidden border border-white/40 bg-[linear-gradient(135deg,#fffdf8_0%,#f6f3ee_50%,#ebe2d4_145%)] p-4 text-left shadow-[0_24px_70px_rgba(18,18,18,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 [transform:translateZ(0)] hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_32px_90px_rgba(18,18,18,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
      {entry.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="absolute inset-0 h-full w-full object-cover opacity-24 transition duration-300 group-hover:opacity-34" src={entry.coverUrl} alt="" />
      ) : null}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(111,77,38,0.16),transparent_32%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.54)_45%,transparent_65%)] opacity-90 transition duration-300 group-hover:translate-x-3" />
      <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-brand/35 shadow-[0_0_28px_rgba(111,77,38,0.38)]" />
      <span>
        <span className="mb-5 inline-flex h-10 w-10 items-center justify-center border border-site bg-white/45 text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="relative z-10 block min-w-0 break-words text-2xl font-semibold leading-tight">{entry.title}</span>
        {!compact ? (
          <span className="relative z-10 mt-3 line-clamp-3 block text-sm leading-6 text-site-muted">
            {entry.description}
          </span>
        ) : null}
      </span>
      <span className="relative z-10 grid grid-cols-3 gap-2">
        {entry.stats.map((stat) => (
          <PlaybookStatBadge key={`${stat.value ?? "type"}-${stat.label}`} stat={stat} />
        ))}
      </span>
      </button>
      <button
        type="button"
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center border border-site bg-white/80 text-site-muted transition hover:text-site"
        onClick={(event) => {
          event.stopPropagation();
          entry.onEdit();
        }}
        aria-label={`Edit ${entry.title}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PlaybookListItem({ entry }: { entry: CardEntry }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-site bg-card p-3">
      <button type="button" className="h-14 w-20 overflow-hidden border border-site bg-site" onClick={entry.onOpen}>
        {entry.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full object-cover" src={entry.coverUrl} alt="" />
        ) : (
          <BookOpen className="m-auto h-full w-5 text-brand" aria-hidden="true" />
        )}
      </button>
      <button type="button" className="min-w-0 text-left" onClick={entry.onOpen}>
        <p className="truncate font-semibold">{entry.title}</p>
        <p className="mt-1 truncate text-sm text-site-muted">{entry.description}</p>
      </button>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-site-muted sm:inline">
          {formatCardStats(entry.stats)}
        </span>
        <button type="button" className="icon-button" onClick={entry.onEdit} aria-label={`Edit ${entry.title}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CardModal({
  onClose,
  onDelete,
  onSubmit,
  state,
  syncing,
}: {
  onClose: () => void;
  onDelete: () => void;
  onSubmit: (values: CardFormValues) => void;
  state: Exclude<ModalState, null>;
  syncing: boolean;
}) {
  const initialTitle = state.mode === "edit" ? state.item.title : "";
  const initialDescription = state.kind === "course" && state.mode === "edit" ? state.item.description : "";
  const initialCoverPath = state.mode === "edit" ? state.item.coverPath : null;
  const initialCoverUrl = state.mode === "edit" ? state.item.coverUrl : "";
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(initialCoverUrl);
  const [description, setDescription] = useState(initialDescription);
  const [title, setTitle] = useState(initialTitle);
  const modalTitle = `${state.mode === "edit" ? "Edit" : "Add"} ${state.kind}`;

  function handleCover(file: File | null) {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : initialCoverUrl);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
      <form
        className="surface w-full max-w-lg p-5 shadow-[0_28px_90px_rgba(18,18,18,0.28)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ coverFile, coverPath: initialCoverPath, description, title });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{state.mode === "edit" ? "Edit card" : "New card"}</p>
            <h2 className="mt-2 text-2xl font-semibold">{modalTitle}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={`Close ${modalTitle} modal`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="grid min-h-36 cursor-pointer place-items-center overflow-hidden border border-dashed border-site bg-site text-sm font-semibold text-site-muted">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-full max-h-56 w-full object-cover" src={coverPreview} alt="" />
            ) : (
              <span>Optional cover</span>
            )}
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => handleCover(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="sr-only" htmlFor="playbook-card-title">Title</label>
          <input
            id="playbook-card-title"
            className="form-input"
            placeholder={`${state.kind[0].toUpperCase()}${state.kind.slice(1)} title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {state.kind === "course" ? (
            <>
              <label className="sr-only" htmlFor="playbook-card-description">Short description</label>
              <textarea
                id="playbook-card-description"
                className="form-input min-h-28 resize-none"
                placeholder="Short description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </>
          ) : null}
          <button className="btn-primary justify-center bg-ink text-white" type="submit" disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {modalTitle}
          </button>
          {state.mode === "edit" ? (
            <button
              className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={syncing}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete {state.kind}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function ChapterWorkspace({
  chapter,
  linkTitle,
  linkValue,
  onCreateLink,
  onCreateTextItem,
  onDeleteItem,
  onDrop,
  onFileSelect,
  onLinkTitleChange,
  onLinkValueChange,
  onSaveNotes,
  syncing,
}: {
  chapter: PlaybookChapter | undefined;
  linkTitle: string;
  linkValue: string;
  onCreateLink: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTextItem: (title: string, notes: string) => void;
  onDeleteItem: (item: PlaybookItem) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileSelect: (files: File[]) => void;
  onLinkTitleChange: (value: string) => void;
  onLinkValueChange: (value: string) => void;
  onSaveNotes: (item: PlaybookItem, notes: string) => void;
  syncing: boolean;
}) {
  const [textNotes, setTextNotes] = useState("");
  const [textTitle, setTextTitle] = useState("");

  return (
    <div className="grid gap-4">
      {chapter ? (
        <>
          <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
            <div className="surface p-5">
              <div
                className="border border-dashed border-site bg-site p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">Drop image or video files</p>
                    <p className="mt-1 text-sm text-site-muted">
                      Images are compressed to WebP. Videos are uploaded as source files.
                    </p>
                  </div>
                  <label className="btn-secondary cursor-pointer border border-site bg-card text-site">
                    <FileImage className="h-4 w-4" aria-hidden="true" />
                    Choose files
                    <input
                      className="sr-only"
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      onChange={(event) => {
                        onFileSelect(Array.from(event.target.files ?? []));
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <form className="mt-3 grid gap-2 lg:grid-cols-[220px_1fr_auto]" onSubmit={onCreateLink}>
                <label className="sr-only" htmlFor="playbook-link-title">Media title</label>
                <input
                  id="playbook-link-title"
                  className="form-input"
                  placeholder="Title"
                  value={linkTitle}
                  onChange={(event) => onLinkTitleChange(event.target.value)}
                />
                <label className="sr-only" htmlFor="playbook-link-url">YouTube, image or website link</label>
                <input
                  id="playbook-link-url"
                  className="form-input"
                  placeholder="Paste YouTube, image or link"
                  value={linkValue}
                  onChange={(event) => onLinkValueChange(event.target.value)}
                />
                <button className="btn-primary justify-center bg-ink text-white" type="submit">
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </form>
            </div>

            <form
              className="surface p-5"
              onSubmit={(event) => {
                event.preventDefault();
                onCreateTextItem(textTitle, textNotes);
                setTextTitle("");
                setTextNotes("");
              }}
            >
              <p className="eyebrow">Text chapter</p>
              <label className="sr-only" htmlFor="playbook-text-title">Text title</label>
              <input
                id="playbook-text-title"
                className="form-input mt-4"
                placeholder="Text title"
                value={textTitle}
                onChange={(event) => setTextTitle(event.target.value)}
              />
              <label className="sr-only" htmlFor="playbook-text-notes">Text content</label>
              <textarea
                id="playbook-text-notes"
                className="form-input mt-2 min-h-28 resize-y leading-6"
                placeholder="Write text-only chapter notes"
                value={textNotes}
                onChange={(event) => setTextNotes(event.target.value)}
              />
              <button className="btn-secondary mt-3 justify-center border border-site bg-card text-site" type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add text
              </button>
            </form>
          </section>

          <div className="mt-5 grid gap-4">
            {chapter.items.length ? chapter.items.map((item) => (
              <PlaybookItemCard
                key={item.id}
                item={item}
                onDelete={() => onDeleteItem(item)}
                onSaveNotes={(notes) => onSaveNotes(item, notes)}
                syncing={syncing}
              />
            )) : (
              <EmptyState text="Add a YouTube link, image, video, or notes block." />
            )}
          </div>
        </>
      ) : (
        <EmptyState text="Create or select a chapter to add course material." />
      )}
    </div>
  );
}

function PlaybookItemCard({
  item,
  onDelete,
  onSaveNotes,
  syncing,
}: {
  item: PlaybookItem;
  onDelete: () => void;
  onSaveNotes: (notes: string) => void;
  syncing: boolean;
}) {
  const [notes, setNotes] = useState(item.notes);

  return (
    <article className="grid items-stretch gap-3 border border-site bg-card p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{item.title || getDefaultItemTitle(item.type)}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-site-muted">
              {item.type}
            </p>
          </div>
          <button className="icon-button" type="button" onClick={onDelete} aria-label={`Delete ${item.title || item.type}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <MediaPreview item={item} />
      </div>
      <div className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3">
        <label className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-site-muted" htmlFor={`notes-${item.id}`}>
          Notes
        </label>
        <textarea
          id={`notes-${item.id}`}
          className="form-input h-full min-h-44 resize-y leading-6"
          placeholder="Write notes, checklist, key frames, mistakes to avoid..."
          value={notes}
          onBlur={() => {
            if (notes !== item.notes) onSaveNotes(notes);
          }}
          onChange={(event) => setNotes(event.target.value)}
        />
        {syncing ? <p className="mt-2 text-xs text-site-muted">Saving...</p> : null}
      </div>
    </article>
  );
}

function MediaPreview({ item }: { item: PlaybookItem }) {
  const url = item.signedUrl || item.sourceUrl;

  if (item.type === "text") {
    return (
      <div className="min-h-28 border border-site bg-site p-4 text-sm leading-6 text-site-muted">
        {item.notes || "Text notes"}
      </div>
    );
  }

  if (item.type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(item.sourceUrl);
    return embedUrl ? (
      <iframe
        className="aspect-video w-full border border-site bg-ink"
        src={embedUrl}
        title={item.title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    ) : <LinkPreview item={item} />;
  }

  if (item.type === "video" && url) {
    return (
      <video className="aspect-video w-full border border-site bg-ink" src={url} controls preload="metadata" />
    );
  }

  if (item.type === "image" && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="max-h-[420px] w-full border border-site object-contain" src={url} alt={item.title || "Playbook image"} />
    );
  }

  return <LinkPreview item={item} />;
}

function LinkPreview({ item }: { item: PlaybookItem }) {
  return (
    <a
      className="flex min-h-28 items-center gap-3 border border-site bg-site p-4 text-sm font-semibold text-site transition hover:border-ink/30"
      href={item.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {item.type === "video" ? <Film className="h-5 w-5" aria-hidden="true" /> : <LinkIcon className="h-5 w-5" aria-hidden="true" />}
      <span className="break-all">{item.sourceUrl || "Text note"}</span>
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-site bg-site px-4 py-4 text-sm text-site-muted">
      {text}
    </div>
  );
}

function getDefaultItemTitle(type: PlaybookItemType) {
  if (type === "youtube") return "YouTube lesson";
  if (type === "video") return "Video lesson";
  if (type === "image") return "Image reference";
  if (type === "link") return "Resource link";
  return "Notes";
}

function countCourseChapters(course: PlaybookCourse) {
  return course.modules.reduce((sum, module) => sum + module.chapters.length, 0);
}

function countCourseItems(course: PlaybookCourse) {
  return course.modules.reduce((sum, module) => sum + countModuleItems(module), 0);
}

function countModuleItems(module: PlaybookModule) {
  return module.chapters.reduce((sum, chapter) => sum + chapter.items.length, 0);
}

function getSchemaMessage() {
  return "Sync failed. Please run the latest playbooks Supabase schema.";
}
