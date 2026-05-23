"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  updatePlaybookItemContent,
  updatePlaybookItemNotes,
  updatePlaybookModule,
  uploadPlaybookCover,
  uploadPlaybookFile,
  type PlaybookChapter,
  type PlaybookCourse,
  type PlaybookItem,
  type PlaybookModule,
} from "@/lib/playbooks-data";

type ViewMode = "cards" | "list" | "split";
type CardKind = "chapter" | "course" | "module";
type ContentLayout = "single" | "double";
type ContentSlotMode = "file" | "link" | "text";
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

type ContentSlotValues = {
  file: File | null;
  mode: ContentSlotMode;
  text: string;
  url: string;
};

const contentLayoutOptions: ContentLayout[] = ["single", "double"];
const contentSlotModes: ContentSlotMode[] = ["text", "link", "file"];

function createEmptyContentSlot(mode: ContentSlotMode = "text"): ContentSlotValues {
  return { file: null, mode, text: "", url: "" };
}

function getVisibleContentSlots(layout: ContentLayout, slots: ContentSlotValues[]) {
  return layout === "single" ? slots.slice(0, 1) : slots;
}

export default function DashboardPlaybooks() {
  const [courses, setCourses] = useState<PlaybookCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingContentRow, setEditingContentRow] = useState<PlaybookItem[] | null>(null);
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
  const actionLabel = selectedChapter ? "Add content" : `Add ${actionKind}`;
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

  function getNextContentPosition(chapter: PlaybookChapter) {
    return chapter.items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
  }

  async function createContentSlot(
    slot: ContentSlotValues,
    chapterId: string,
    layoutColumn: number,
    layoutGroupId: string,
    position: number,
  ) {
    if (slot.mode === "file") {
      if (slot.file) {
        const uploaded = await uploadPlaybookFile(userId!, slot.file);
        await createPlaybookItem(userId!, {
          chapterId,
          layoutColumn,
          layoutGroupId,
          mimeType: uploaded.mimeType,
          position,
          storagePath: uploaded.path,
          type: uploaded.type,
        });
        return;
      }

      await createPlaybookItem(userId!, {
        chapterId,
        layoutColumn,
        layoutGroupId,
        position,
        type: "file",
      });
      return;
    }

    if (slot.mode === "link") {
      const sourceUrl = slot.url.trim();
      await createPlaybookItem(userId!, {
        chapterId,
        layoutColumn,
        layoutGroupId,
        position,
        sourceUrl,
        type: sourceUrl ? getLinkItemType(sourceUrl) : "link",
      });
      return;
    }

    await createPlaybookItem(userId!, {
      chapterId,
      layoutColumn,
      layoutGroupId,
      notes: slot.text,
      position,
      type: "text",
    });
  }

  async function updateContentSlot(item: PlaybookItem, slot: ContentSlotValues) {
    if (slot.mode === "file") {
      if (slot.file) {
        const uploaded = await uploadPlaybookFile(userId!, slot.file);
        await updatePlaybookItemContent(userId!, item, {
          mimeType: uploaded.mimeType,
          storagePath: uploaded.path,
          type: uploaded.type,
        });
        return;
      }

      if (item.storagePath && (item.type === "file" || item.type === "image" || item.type === "video")) {
        return;
      }

      await updatePlaybookItemContent(userId!, item, {
        mimeType: null,
        storagePath: null,
        type: "file",
      });
      return;
    }

    if (slot.mode === "link") {
      const sourceUrl = slot.url.trim();
      await updatePlaybookItemContent(userId!, item, {
        sourceUrl,
        type: sourceUrl ? getLinkItemType(sourceUrl) : "link",
      });
      return;
    }

    await updatePlaybookItemContent(userId!, item, {
      notes: slot.text,
      type: "text",
    });
  }

  function handleCreateContent(slots: ContentSlotValues[]) {
    if (!selectedChapter) return;

    void runSync(async () => {
      const layoutGroupId = crypto.randomUUID();
      const position = getNextContentPosition(selectedChapter);

      for (const [layoutColumn, slot] of slots.entries()) {
        await createContentSlot(slot, selectedChapter.id, layoutColumn, layoutGroupId, position);
      }
      setContentModalOpen(false);
    });
  }

  function handleUpdateContentRow(items: PlaybookItem[], slots: ContentSlotValues[]) {
    if (!items.length) return;

    void runSync(async () => {
      const chapterId = items[0].chapterId;
      const layoutGroupId = items[0].layoutGroupId || items[0].id;
      const position = items.reduce((min, item) => Math.min(min, item.position), items[0].position);
      const desiredColumns = new Set(slots.map((_, index) => index));

      for (const [layoutColumn, slot] of slots.entries()) {
        const existing = items.find((item) => item.layoutColumn === layoutColumn);
        if (existing) {
          await updateContentSlot(existing, slot);
        } else {
          await createContentSlot(slot, chapterId, layoutColumn, layoutGroupId, position);
        }
      }

      for (const item of items) {
        if (!desiredColumns.has(item.layoutColumn)) {
          await deletePlaybookItem(userId!, item);
        }
      }

      setEditingContentRow(null);
    });
  }

  const courseCards = courses.map((course): CardEntry => ({
    coverPath: course.coverPath,
    coverUrl: course.coverUrl,
    description: course.description,
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
    description: "",
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
    description: "",
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
            onClick={() => {
              if (selectedChapter) {
                setContentModalOpen(true);
                return;
              }
              setModalState({ kind: actionKind, mode: "create" } as ModalState);
            }}
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
        <div className={treeCollapsed ? "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ease-out xl:grid-cols-[56px_1fr]" : "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ease-out xl:grid-cols-[280px_1fr]"}>
          <PlaybooksTreeNav
            collapsed={treeCollapsed}
            courses={courses}
            onAllCourses={() => {
              setCourseId("");
              setModuleId("");
              setChapterId("");
            }}
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
          <div className="min-h-0 min-w-0 overflow-y-auto px-6 py-3 sm:px-8 sm:py-4 xl:px-10">
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
                        description: "",
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
                        description: "",
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
                      onDeleteItem={(item) => void runSync(() => deletePlaybookItem(userId!, item))}
                      onEditRow={setEditingContentRow}
                      onSaveText={(item, notes) => void runSync(() => updatePlaybookItemNotes(userId!, item.id, notes))}
                      syncing={syncing}
                    />
                  ) : null;
                }}
                viewMode={viewMode}
              />
            ) : (
              <ChapterWorkspace
                chapter={selectedChapter}
                onDeleteItem={(item) => void runSync(() => deletePlaybookItem(userId!, item))}
                onEditRow={setEditingContentRow}
                onSaveText={(item, notes) => void runSync(() => updatePlaybookItemNotes(userId!, item.id, notes))}
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

      {contentModalOpen && selectedChapter ? (
        <ContentModal
          chapter={selectedChapter}
          onClose={() => setContentModalOpen(false)}
          onCreateContent={handleCreateContent}
          syncing={syncing}
        />
      ) : null}

      {editingContentRow ? (
        <EditContentModal
          items={editingContentRow}
          onClose={() => setEditingContentRow(null)}
          onSubmit={(slots) => handleUpdateContentRow(editingContentRow, slots)}
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
  onCourse,
  onModule,
}: {
  chapter: PlaybookChapter | undefined;
  course: PlaybookCourse | undefined;
  module: PlaybookModule | undefined;
  onCourse: () => void;
  onModule: () => void;
}) {
  if (!course) return <nav className="h-5" aria-label="Playbook navigation" />;

  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-site-muted" aria-label="Playbook navigation">
      <span>/</span>
      <button type="button" className="max-w-52 truncate transition hover:text-brand" onClick={onCourse}>
        {course.title}
      </button>
      {module ? (
        <>
          <span>/</span>
          <button type="button" className="max-w-52 truncate transition hover:text-brand" onClick={onModule}>
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
  onAllCourses,
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
  onAllCourses: () => void;
  onSelectChapter: (courseId: string, moduleId: string, chapterId: string) => void;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (courseId: string, moduleId: string) => void;
  onToggle: () => void;
  selectedChapterId: string;
  selectedCourseId: string;
  selectedModuleId: string;
}) {
  const [openCourseId, setOpenCourseId] = useState(selectedCourseId);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-site bg-card transition-[width] duration-300 ease-out">
      <div className={collapsed ? "flex justify-center border-b border-site p-2 transition-[gap,padding] duration-300 ease-out" : "flex items-center justify-between gap-3 border-b border-site px-4 py-3 transition-[gap,padding] duration-300 ease-out"}>
        {!collapsed ? (
          <button
            type="button"
            className={selectedCourseId ? "eyebrow text-site-muted transition hover:text-brand" : "eyebrow text-brand"}
            onClick={() => {
              setOpenCourseId("");
              onAllCourses();
            }}
          >
            All courses
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-site bg-site text-site-muted transition hover:border-brand/35 hover:bg-brand-soft hover:text-brand"
          onClick={onToggle}
          aria-label={collapsed ? "Expand playbooks navigation" : "Collapse playbooks navigation"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {courses.length ? courses.map((course) => {
            const isCourseActive = selectedCourseId === course.id && !selectedModuleId;
            const isCourseOpen = openCourseId === course.id;

            return (
              <div key={course.id} className="grid border-b border-site py-1 last:border-b-0">
                <div className={isCourseActive ? "grid grid-cols-[1fr_auto] items-center border border-ink bg-ink text-white" : "grid grid-cols-[1fr_auto] items-center border border-transparent text-site transition hover:border-brand/35 hover:bg-brand-soft hover:text-brand"}>
                  <button
                    type="button"
                    className="min-w-0 px-3 py-2.5 text-left text-sm font-semibold"
                    onClick={() => onSelectCourse(course.id)}
                  >
                    <span className="block min-w-0 truncate">{course.title}</span>
                  </button>
                  <button
                    type="button"
                    className={isCourseActive ? "grid h-full min-h-10 w-10 place-items-center border-l border-white/18 text-white transition hover:bg-white/10" : "grid h-full min-h-10 w-10 place-items-center border-l border-site text-site-muted transition hover:bg-card hover:text-brand"}
                    onClick={() => setOpenCourseId(isCourseOpen ? "" : course.id)}
                    aria-label={isCourseOpen ? `Collapse ${course.title}` : `Expand ${course.title}`}
                  >
                    {isCourseOpen ? <ChevronDown className="h-4 w-4 transition-transform duration-200" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 transition-transform duration-200" aria-hidden="true" />}
                  </button>
                </div>
              <div className={openCourseId === course.id ? "grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out" : "grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out"}>
                <div className="min-h-0 overflow-hidden">
                  {course.modules.map((module) => (
                    <div key={module.id} className="grid">
                      <button
                        type="button"
                        className={selectedModuleId === module.id && !selectedChapterId ? "ml-3 border border-ink bg-ink px-3 py-2 text-left text-sm font-semibold text-white" : "ml-3 border border-transparent px-3 py-2 text-left text-sm text-site-muted transition hover:border-brand/35 hover:bg-brand-soft hover:text-brand"}
                        onClick={() => {
                          setOpenCourseId(course.id);
                          onSelectModule(course.id, module.id);
                        }}
                      >
                        {module.title}
                      </button>
                      {module.chapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          type="button"
                          className={selectedChapterId === chapter.id ? "ml-6 border border-ink bg-ink px-3 py-2 text-left text-xs font-semibold text-white" : "ml-6 border border-transparent px-3 py-2 text-left text-xs text-site-muted transition hover:border-brand/35 hover:bg-brand-soft hover:text-brand"}
                          onClick={() => {
                            setOpenCourseId(course.id);
                            onSelectChapter(course.id, module.id, chapter.id);
                          }}
                        >
                          {chapter.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          }) : (
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
        {!compact && entry.description ? (
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
        {entry.description ? <p className="mt-1 truncate text-sm text-site-muted">{entry.description}</p> : null}
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

function ContentModal({
  chapter,
  onClose,
  onCreateContent,
  syncing,
}: {
  chapter: PlaybookChapter;
  onClose: () => void;
  onCreateContent: (slots: ContentSlotValues[]) => void;
  syncing: boolean;
}) {
  const [layout, setLayout] = useState<ContentLayout>("single");
  const [slots, setSlots] = useState<ContentSlotValues[]>([
    createEmptyContentSlot(),
    createEmptyContentSlot(),
  ]);
  const visibleSlots = getVisibleContentSlots(layout, slots);

  function updateSlot(index: number, values: Partial<ContentSlotValues>) {
    setSlots((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...values } : slot
    )));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
      <form
        className="surface grid max-h-[92vh] w-full max-w-5xl overflow-y-auto p-5 shadow-[0_28px_90px_rgba(18,18,18,0.28)]"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateContent(visibleSlots);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Add content</p>
            <h2 className="mt-2 text-2xl font-semibold">{chapter.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close add content modal">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ContentSlotEditor
          idPrefix="playbook-content"
          layout={layout}
          onLayoutChange={setLayout}
          onSlotChange={updateSlot}
          slots={visibleSlots}
        />

        <button className="btn-primary mt-4 justify-center bg-ink text-white" type="submit" disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Add content
        </button>
      </form>
    </div>
  );
}

function getSlotFromItem(item: PlaybookItem | undefined): ContentSlotValues {
  if (!item) return createEmptyContentSlot();
  if (item.type === "text") return { ...createEmptyContentSlot("text"), text: item.notes };
  if (item.type === "file" || item.type === "image" || item.type === "video") {
    return createEmptyContentSlot("file");
  }
  return { ...createEmptyContentSlot("link"), url: item.sourceUrl };
}

function ContentSlotEditor({
  existingItems = [],
  idPrefix,
  layout,
  onLayoutChange,
  onSlotChange,
  slots,
}: {
  existingItems?: PlaybookItem[];
  idPrefix: string;
  layout: ContentLayout;
  onLayoutChange: (layout: ContentLayout) => void;
  onSlotChange: (index: number, values: Partial<ContentSlotValues>) => void;
  slots: ContentSlotValues[];
}) {
  return (
    <>
      <div className="mt-5 inline-grid w-fit grid-cols-2 border border-site bg-site p-1">
        {contentLayoutOptions.map((item) => (
          <button
            key={item}
            type="button"
            className={layout === item ? "bg-ink px-4 py-2 text-sm font-semibold text-white" : "px-4 py-2 text-sm font-semibold text-site-muted transition hover:text-site"}
            onClick={() => onLayoutChange(item)}
          >
            {item === "single" ? "1 block" : "2 blocks"}
          </button>
        ))}
      </div>

      <section className={layout === "double" ? "mt-4 grid grid-cols-2 gap-3" : "mt-4 grid gap-3"}>
        {slots.map((slot, index) => {
          const existingItem = existingItems.find((item) => item.layoutColumn === index);

          return (
            <div key={index} className="border border-site bg-card p-4">
              <div className="grid grid-cols-3 border border-site bg-site p-1">
                {contentSlotModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={slot.mode === mode ? "bg-ink px-3 py-2 text-sm font-semibold capitalize text-white" : "px-3 py-2 text-sm font-semibold capitalize text-site-muted transition hover:text-site"}
                    onClick={() => onSlotChange(index, { mode })}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {slot.mode === "text" ? (
                <>
                  <label className="sr-only" htmlFor={`${idPrefix}-text-${index}`}>Text content</label>
                  <textarea
                    id={`${idPrefix}-text-${index}`}
                    className="form-input mt-3 min-h-48 resize-y leading-6"
                    placeholder="Write text"
                    value={slot.text}
                    onChange={(event) => onSlotChange(index, { text: event.target.value })}
                  />
                </>
              ) : null}

              {slot.mode === "link" ? (
                <>
                  <label className="sr-only" htmlFor={`${idPrefix}-link-${index}`}>YouTube, image or website link</label>
                  <input
                    id={`${idPrefix}-link-${index}`}
                    className="form-input mt-3"
                    placeholder="Paste YouTube, image or link"
                    value={slot.url}
                    onChange={(event) => onSlotChange(index, { url: event.target.value })}
                  />
                </>
              ) : null}

              {slot.mode === "file" ? (
                <label className="mt-3 grid min-h-48 cursor-pointer place-items-center border border-dashed border-site bg-site p-4 text-center text-sm font-semibold text-site-muted">
                  <span>
                    {slot.file
                      ? slot.file.name
                      : existingItem?.storagePath
                        ? "Choose a replacement file"
                        : "Choose image, video or file"}
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    onChange={(event) => onSlotChange(index, { file: event.target.files?.[0] ?? null })}
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </section>
    </>
  );
}

function EditContentModal({
  items,
  onClose,
  onSubmit,
  syncing,
}: {
  items: PlaybookItem[];
  onClose: () => void;
  onSubmit: (slots: ContentSlotValues[]) => void;
  syncing: boolean;
}) {
  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.layoutColumn - right.layoutColumn),
    [items],
  );
  const [layout, setLayout] = useState<ContentLayout>(
    () => sortedItems.some((item) => item.layoutColumn === 1) ? "double" : "single",
  );
  const [slots, setSlots] = useState<ContentSlotValues[]>(() => [
    getSlotFromItem(sortedItems.find((item) => item.layoutColumn === 0)),
    getSlotFromItem(sortedItems.find((item) => item.layoutColumn === 1)),
  ]);
  const visibleSlots = getVisibleContentSlots(layout, slots);

  function updateSlot(index: number, values: Partial<ContentSlotValues>) {
    setSlots((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...values } : slot
    )));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
      <form
        className="surface grid max-h-[92vh] w-full max-w-5xl overflow-y-auto p-5 shadow-[0_28px_90px_rgba(18,18,18,0.28)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(visibleSlots);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Edit content</p>
            <h2 className="mt-2 text-2xl font-semibold">Block layout</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close edit content modal">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ContentSlotEditor
          existingItems={sortedItems}
          idPrefix="playbook-edit"
          layout={layout}
          onLayoutChange={setLayout}
          onSlotChange={updateSlot}
          slots={visibleSlots}
        />

        <button className="btn-primary mt-4 justify-center bg-ink text-white" type="submit" disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
          Update content
        </button>
      </form>
    </div>
  );
}

function getContentRows(items: PlaybookItem[]) {
  const rows = new Map<string, { id: string; items: PlaybookItem[]; position: number }>();

  for (const item of items) {
    const id = item.layoutGroupId || item.id;
    const existing = rows.get(id);
    if (existing) {
      existing.items.push(item);
      existing.position = Math.min(existing.position, item.position);
    } else {
      rows.set(id, { id, items: [item], position: item.position });
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      items: row.items.sort((left, right) => left.layoutColumn - right.layoutColumn),
    }))
    .sort((left, right) => left.position - right.position);
}

function isImageContent(item: PlaybookItem) {
  return item.type === "image" && Boolean(item.signedUrl || item.sourceUrl || item.storagePath);
}

function isMixedImageTextRow(items: PlaybookItem[]) {
  return items.length === 2 && items.some(isImageContent) && items.some((item) => item.type === "text");
}

function getContentRowClass(items: PlaybookItem[]) {
  if (items.length < 2) return "grid gap-5";
  if (isMixedImageTextRow(items)) return "flex items-start gap-4";
  return "grid grid-cols-2 items-start gap-4";
}

function getContentBlockClass(item: PlaybookItem, items: PlaybookItem[]) {
  if (!isMixedImageTextRow(items)) return "group relative min-w-0";
  return isImageContent(item)
    ? "group relative min-w-0 flex-none max-w-[50%]"
    : "group relative min-w-0 flex-1";
}

function ChapterWorkspace({
  chapter,
  onDeleteItem,
  onEditRow,
  onSaveText,
  syncing,
}: {
  chapter: PlaybookChapter | undefined;
  onDeleteItem: (item: PlaybookItem) => void;
  onEditRow: (items: PlaybookItem[]) => void;
  onSaveText: (item: PlaybookItem, notes: string) => void;
  syncing: boolean;
}) {
  const rows = chapter ? getContentRows(chapter.items) : [];

  return (
    <div className="mx-auto grid w-full max-w-none gap-6">
      {chapter ? (
        <>
          <header>
            <p className="eyebrow text-site-muted">Chapter</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-site">{chapter.title}</h1>
          </header>
          <div className="grid gap-8">
            {rows.length ? rows.map((row) => (
              <section
                key={row.id}
                className={getContentRowClass(row.items)}
              >
                {row.items.map((item) => (
                  <PlaybookContentBlock
                    key={item.id}
                    className={getContentBlockClass(item, row.items)}
                    compactImage={isMixedImageTextRow(row.items) && isImageContent(item)}
                    item={item}
                    onDelete={() => onDeleteItem(item)}
                    onEdit={() => onEditRow(row.items)}
                    onSaveText={(notes) => onSaveText(item, notes)}
                    syncing={syncing}
                  />
                ))}
              </section>
            )) : (
              <EmptyState text="Add a YouTube link, image, video, or text block." />
            )}
          </div>
        </>
      ) : (
        <EmptyState text="Create or select a chapter to add course material." />
      )}
    </div>
  );
}

function PlaybookContentBlock({
  className,
  compactImage,
  item,
  onDelete,
  onEdit,
  onSaveText,
  syncing,
}: {
  className: string;
  compactImage: boolean;
  item: PlaybookItem;
  onDelete: () => void;
  onEdit: () => void;
  onSaveText: (notes: string) => void;
  syncing: boolean;
}) {
  const isEmptyMediaBlock = item.type !== "text" && !item.signedUrl && !item.sourceUrl && !item.storagePath;

  return (
    <article className={className}>
      <div className="absolute right-2 top-2 z-10 inline-flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          className="inline-flex h-8 w-8 items-center justify-center border border-site bg-card/90 text-site-muted shadow-sm transition hover:text-site"
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${item.type} block`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="inline-flex h-8 w-8 items-center justify-center border border-site bg-card/90 text-site-muted shadow-sm transition hover:text-site"
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.type} block`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {item.type === "text" ? (
        <textarea
          key={`${item.id}-${item.notes}`}
          className="min-h-52 w-full resize-none border-0 bg-transparent p-0 pr-20 text-base leading-8 text-site outline-none placeholder:text-site-muted/55 focus:outline-none"
          defaultValue={item.notes}
          placeholder="Write text"
          onBlur={(event) => {
            const nextText = event.currentTarget.value;
            if (nextText !== item.notes) onSaveText(nextText);
          }}
        />
      ) : isEmptyMediaBlock ? (
        <button
          className="grid min-h-52 w-full place-items-center border border-dashed border-site bg-site/60 px-6 py-10 text-center text-sm font-semibold text-site-muted transition hover:border-ink hover:bg-card hover:text-site"
          type="button"
          onClick={onEdit}
        >
          Add media, file, or link
        </button>
      ) : (
        <MediaPreview compactImage={compactImage} item={item} />
      )}
      {syncing ? <p className="mt-2 text-xs text-site-muted">Saving...</p> : null}
    </article>
  );
}

function MediaPreview({ compactImage = false, item }: { compactImage?: boolean; item: PlaybookItem }) {
  const url = item.signedUrl || item.sourceUrl;

  if (item.type === "text") {
    return (
      <div className="whitespace-pre-wrap text-base leading-8 text-site">
        {item.notes}
      </div>
    );
  }

  if (item.type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(item.sourceUrl);
    return embedUrl ? (
      <iframe
        className="aspect-video w-full bg-ink"
        src={embedUrl}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    ) : <LinkPreview item={item} />;
  }

  if (item.type === "video" && url) {
    return (
      <video className="aspect-video w-full bg-ink" src={url} controls preload="metadata" />
    );
  }

  if (item.type === "image" && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={compactImage ? "max-h-[560px] max-w-full object-contain" : "max-h-[560px] w-full object-contain"}
        src={url}
        alt="Playbook image"
      />
    );
  }

  return <LinkPreview item={item} />;
}

function LinkPreview({ item }: { item: PlaybookItem }) {
  const href = item.signedUrl || item.sourceUrl;

  return (
    <a
      className="inline-flex max-w-full items-center gap-3 text-sm font-semibold text-brand underline-offset-4 transition hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {item.type === "video" ? <Film className="h-5 w-5" aria-hidden="true" /> : <LinkIcon className="h-5 w-5" aria-hidden="true" />}
      <span className="break-all">{item.sourceUrl || item.storagePath || "File"}</span>
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
