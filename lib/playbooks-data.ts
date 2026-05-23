"use client";

import { supabase } from "@/lib/supabase/client";

export type PlaybookItemType = "youtube" | "video" | "image" | "file" | "link" | "text";

export type PlaybookCourse = {
  category: string;
  coverPath: string | null;
  coverUrl: string;
  description: string;
  id: string;
  modules: PlaybookModule[];
  position: number;
  title: string;
};

export type PlaybookModule = {
  chapters: PlaybookChapter[];
  coverPath: string | null;
  coverUrl: string;
  courseId: string;
  id: string;
  position: number;
  title: string;
};

export type PlaybookChapter = {
  coverPath: string | null;
  coverUrl: string;
  id: string;
  items: PlaybookItem[];
  moduleId: string;
  position: number;
  title: string;
};

export type PlaybookItem = {
  chapterId: string;
  id: string;
  layoutColumn: number;
  layoutGroupId: string;
  mimeType: string | null;
  notes: string;
  position: number;
  signedUrl: string;
  sourceUrl: string;
  storagePath: string | null;
  title: string;
  type: PlaybookItemType;
};

type CourseRow = {
  category: string | null;
  cover_path: string | null;
  description: string | null;
  id: string;
  position: number | null;
  title: string | null;
};

type ModuleRow = {
  cover_path: string | null;
  course_id: string;
  id: string;
  position: number | null;
  title: string | null;
};

type ChapterRow = {
  cover_path: string | null;
  id: string;
  module_id: string;
  position: number | null;
  title: string | null;
};

type ItemRow = {
  chapter_id: string;
  id: string;
  layout_column?: number | null;
  layout_group_id?: string | null;
  mime_type: string | null;
  notes: string | null;
  position: number | null;
  source_url: string | null;
  storage_path: string | null;
  title: string | null;
  type: string | null;
};

const playbookMediaBucket = "playbook-media";

export async function loadPlaybooks(userId: string) {
  const [coursesResult, modulesResult, chaptersResult, itemsResult] =
    await Promise.all([
      supabase
        .from("dashboard_playbook_courses")
        .select("id,title,category,description,cover_path,position")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<CourseRow[]>(),
      supabase
        .from("dashboard_playbook_modules")
        .select("id,course_id,title,cover_path,position")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<ModuleRow[]>(),
      supabase
        .from("dashboard_playbook_chapters")
        .select("id,module_id,title,cover_path,position")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<ChapterRow[]>(),
      supabase
        .from("dashboard_playbook_items")
        .select("id,chapter_id,type,title,source_url,storage_path,mime_type,notes,layout_group_id,layout_column,position")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("layout_column", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<ItemRow[]>(),
    ]);

  if (coursesResult.error) throw coursesResult.error;
  if (modulesResult.error) throw modulesResult.error;
  if (chaptersResult.error) throw chaptersResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const signedUrls = await getSignedUrls([
    ...(coursesResult.data ?? []).map((item) => item.cover_path),
    ...(modulesResult.data ?? []).map((item) => item.cover_path),
    ...(chaptersResult.data ?? []).map((item) => item.cover_path),
    ...(itemsResult.data ?? []).map((item) => item.storage_path),
  ].filter((path): path is string => Boolean(path)));
  const itemsByChapter = new Map<string, PlaybookItem[]>();

  for (const row of itemsResult.data ?? []) {
    const item: PlaybookItem = {
      chapterId: row.chapter_id,
      id: row.id,
      layoutColumn: row.layout_column ?? 0,
      layoutGroupId: row.layout_group_id ?? row.id,
      mimeType: row.mime_type,
      notes: row.notes ?? "",
      position: row.position ?? 0,
      signedUrl: row.storage_path ? signedUrls.get(row.storage_path) ?? "" : "",
      sourceUrl: row.source_url ?? "",
      storagePath: row.storage_path,
      title: row.title ?? "",
      type: normalizeItemType(row.type),
    };
    itemsByChapter.set(row.chapter_id, [...(itemsByChapter.get(row.chapter_id) ?? []), item]);
  }

  const chaptersByModule = new Map<string, PlaybookChapter[]>();
  for (const row of chaptersResult.data ?? []) {
    const chapter: PlaybookChapter = {
      coverPath: row.cover_path,
      coverUrl: row.cover_path ? signedUrls.get(row.cover_path) ?? "" : "",
      id: row.id,
      items: itemsByChapter.get(row.id) ?? [],
      moduleId: row.module_id,
      position: row.position ?? 0,
      title: row.title ?? "Untitled chapter",
    };
    chaptersByModule.set(row.module_id, [...(chaptersByModule.get(row.module_id) ?? []), chapter]);
  }

  const modulesByCourse = new Map<string, PlaybookModule[]>();
  for (const row of modulesResult.data ?? []) {
    const playbookModule: PlaybookModule = {
      chapters: chaptersByModule.get(row.id) ?? [],
      coverPath: row.cover_path,
      coverUrl: row.cover_path ? signedUrls.get(row.cover_path) ?? "" : "",
      courseId: row.course_id,
      id: row.id,
      position: row.position ?? 0,
      title: row.title ?? "Untitled module",
    };
    modulesByCourse.set(row.course_id, [...(modulesByCourse.get(row.course_id) ?? []), playbookModule]);
  }

  return (coursesResult.data ?? []).map((row) => ({
    category: row.category ?? "Trading",
    coverPath: row.cover_path,
    coverUrl: row.cover_path ? signedUrls.get(row.cover_path) ?? "" : "",
    description: row.description ?? "",
    id: row.id,
    modules: modulesByCourse.get(row.id) ?? [],
    position: row.position ?? 0,
    title: row.title ?? "Untitled course",
  }));
}

export async function createPlaybookCourse(
  userId: string,
  course: { category: string; coverPath?: string | null; description?: string; position: number; title: string },
) {
  const { error } = await supabase.from("dashboard_playbook_courses").insert({
    category: course.category,
    cover_path: course.coverPath ?? null,
    description: course.description ?? "",
    position: course.position,
    title: course.title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function createPlaybookModule(
  userId: string,
  module: { courseId: string; coverPath?: string | null; position: number; title: string },
) {
  const { error } = await supabase.from("dashboard_playbook_modules").insert({
    cover_path: module.coverPath ?? null,
    course_id: module.courseId,
    position: module.position,
    title: module.title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function createPlaybookChapter(
  userId: string,
  chapter: { coverPath?: string | null; moduleId: string; position: number; title: string },
) {
  const { error } = await supabase.from("dashboard_playbook_chapters").insert({
    cover_path: chapter.coverPath ?? null,
    module_id: chapter.moduleId,
    position: chapter.position,
    title: chapter.title,
    user_id: userId,
  });
  if (error) throw error;
}

export async function updatePlaybookCourse(
  userId: string,
  courseId: string,
  course: { coverPath?: string | null; description: string; title: string },
) {
  const { error } = await supabase
    .from("dashboard_playbook_courses")
    .update({
      cover_path: course.coverPath ?? null,
      description: course.description,
      title: course.title,
    })
    .eq("user_id", userId)
    .eq("id", courseId);
  if (error) throw error;
}

export async function updatePlaybookModule(
  userId: string,
  moduleId: string,
  module: { coverPath?: string | null; title: string },
) {
  const { error } = await supabase
    .from("dashboard_playbook_modules")
    .update({
      cover_path: module.coverPath ?? null,
      title: module.title,
    })
    .eq("user_id", userId)
    .eq("id", moduleId);
  if (error) throw error;
}

export async function updatePlaybookChapter(
  userId: string,
  chapterId: string,
  chapter: { coverPath?: string | null; title: string },
) {
  const { error } = await supabase
    .from("dashboard_playbook_chapters")
    .update({
      cover_path: chapter.coverPath ?? null,
      title: chapter.title,
    })
    .eq("user_id", userId)
    .eq("id", chapterId);
  if (error) throw error;
}

export async function createPlaybookItem(
  userId: string,
  item: {
    chapterId: string;
    mimeType?: string | null;
    layoutColumn?: number;
    layoutGroupId?: string;
    notes?: string;
    position: number;
    sourceUrl?: string;
    storagePath?: string | null;
    title?: string;
    type: PlaybookItemType;
  },
) {
  const { error } = await supabase.from("dashboard_playbook_items").insert({
    chapter_id: item.chapterId,
    layout_column: item.layoutColumn ?? 0,
    layout_group_id: item.layoutGroupId ?? crypto.randomUUID(),
    mime_type: item.mimeType ?? null,
    notes: item.notes ?? "",
    position: item.position,
    source_url: item.sourceUrl ?? "",
    storage_path: item.storagePath ?? null,
    title: item.title ?? "",
    type: item.type,
    user_id: userId,
  });
  if (error) throw error;
}

export async function updatePlaybookItemNotes(
  userId: string,
  itemId: string,
  notes: string,
) {
  const { error } = await supabase
    .from("dashboard_playbook_items")
    .update({ notes })
    .eq("user_id", userId)
    .eq("id", itemId);
  if (error) throw error;
}

export async function updatePlaybookItemContent(
  userId: string,
  item: PlaybookItem,
  content: {
    mimeType?: string | null;
    notes?: string;
    sourceUrl?: string;
    storagePath?: string | null;
    type: PlaybookItemType;
  },
) {
  const nextStoragePath = content.storagePath ?? null;
  if (item.storagePath && item.storagePath !== nextStoragePath) {
    await supabase.storage.from(playbookMediaBucket).remove([item.storagePath]);
  }

  const { error } = await supabase
    .from("dashboard_playbook_items")
    .update({
      mime_type: content.mimeType ?? null,
      notes: content.notes ?? "",
      source_url: content.sourceUrl ?? "",
      storage_path: nextStoragePath,
      title: "",
      type: content.type,
    })
    .eq("user_id", userId)
    .eq("id", item.id);
  if (error) throw error;
}

export async function deletePlaybookItem(userId: string, item: PlaybookItem) {
  if (item.storagePath) {
    await supabase.storage.from(playbookMediaBucket).remove([item.storagePath]);
  }

  const { error } = await supabase
    .from("dashboard_playbook_items")
    .delete()
    .eq("user_id", userId)
    .eq("id", item.id);
  if (error) throw error;
}

export async function deletePlaybookCourse(userId: string, courseId: string) {
  await deletePlaybookMediaForCourse(userId, courseId);

  const { error } = await supabase
    .from("dashboard_playbook_courses")
    .delete()
    .eq("user_id", userId)
    .eq("id", courseId);
  if (error) throw error;
}

export async function deletePlaybookModule(userId: string, moduleId: string) {
  await deletePlaybookMediaForModule(userId, moduleId);

  const { error } = await supabase
    .from("dashboard_playbook_modules")
    .delete()
    .eq("user_id", userId)
    .eq("id", moduleId);
  if (error) throw error;
}

export async function deletePlaybookChapter(userId: string, chapterId: string) {
  await deletePlaybookMediaForChapter(userId, chapterId);

  const { error } = await supabase
    .from("dashboard_playbook_chapters")
    .delete()
    .eq("user_id", userId)
    .eq("id", chapterId);
  if (error) throw error;
}

async function deletePlaybookMediaForCourse(userId: string, courseId: string) {
  const { data: courseRows, error: courseError } = await supabase
    .from("dashboard_playbook_courses")
    .select("cover_path")
    .eq("user_id", userId)
    .eq("id", courseId);
  if (courseError) throw courseError;

  const { data: moduleRows, error: moduleError } = await supabase
    .from("dashboard_playbook_modules")
    .select("id,cover_path")
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (moduleError) throw moduleError;

  const moduleIds = (moduleRows ?? []).map((row) => row.id).filter(Boolean);
  const { data: chapterRows, error: chapterError } = moduleIds.length
    ? await supabase
      .from("dashboard_playbook_chapters")
      .select("id,cover_path")
      .eq("user_id", userId)
      .in("module_id", moduleIds)
    : { data: [], error: null };
  if (chapterError) throw chapterError;

  const chapterIds = (chapterRows ?? []).map((row) => row.id).filter(Boolean);
  const itemPaths = chapterIds.length ? await getPlaybookItemStoragePaths(userId, chapterIds) : [];
  await removePlaybookMedia([
    ...(courseRows ?? []).map((row) => row.cover_path),
    ...(moduleRows ?? []).map((row) => row.cover_path),
    ...(chapterRows ?? []).map((row) => row.cover_path),
    ...itemPaths,
  ]);
}

async function deletePlaybookMediaForModule(userId: string, moduleId: string) {
  const { data: moduleRows, error: moduleError } = await supabase
    .from("dashboard_playbook_modules")
    .select("cover_path")
    .eq("user_id", userId)
    .eq("id", moduleId);
  if (moduleError) throw moduleError;

  const { data: chapterRows, error: chapterError } = await supabase
    .from("dashboard_playbook_chapters")
    .select("id,cover_path")
    .eq("user_id", userId)
    .eq("module_id", moduleId);
  if (chapterError) throw chapterError;

  const chapterIds = (chapterRows ?? []).map((row) => row.id).filter(Boolean);
  const itemPaths = chapterIds.length ? await getPlaybookItemStoragePaths(userId, chapterIds) : [];
  await removePlaybookMedia([
    ...(moduleRows ?? []).map((row) => row.cover_path),
    ...(chapterRows ?? []).map((row) => row.cover_path),
    ...itemPaths,
  ]);
}

async function deletePlaybookMediaForChapter(userId: string, chapterId: string) {
  const { data: chapterRows, error: chapterError } = await supabase
    .from("dashboard_playbook_chapters")
    .select("cover_path")
    .eq("user_id", userId)
    .eq("id", chapterId);
  if (chapterError) throw chapterError;

  const itemPaths = await getPlaybookItemStoragePaths(userId, [chapterId]);
  await removePlaybookMedia([
    ...(chapterRows ?? []).map((row) => row.cover_path),
    ...itemPaths,
  ]);
}

async function getPlaybookItemStoragePaths(userId: string, chapterIds: string[]) {
  const { data, error } = await supabase
    .from("dashboard_playbook_items")
    .select("storage_path")
    .eq("user_id", userId)
    .in("chapter_id", chapterIds);
  if (error) throw error;
  return (data ?? []).map((row) => row.storage_path);
}

async function removePlaybookMedia(paths: Array<string | null>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!uniquePaths.length) return;
  const { error } = await supabase.storage.from(playbookMediaBucket).remove(uniquePaths);
  if (error) throw error;
}

export async function uploadPlaybookFile(userId: string, file: File) {
  const uploadFile = file.type.startsWith("image/")
    ? await compressImage(file)
    : file;
  const mediaType: PlaybookItemType = uploadFile.type.startsWith("image/")
    ? "image"
    : uploadFile.type.startsWith("video/")
      ? "video"
      : "file";
  const extension = getFileExtension(uploadFile.name, mediaType);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(playbookMediaBucket)
    .upload(path, uploadFile, {
      cacheControl: "31536000",
      contentType: uploadFile.type,
      upsert: false,
    });

  if (error) throw error;

  return {
    mimeType: uploadFile.type,
    originalName: file.name,
    path,
    type: mediaType,
  };
}

export async function uploadPlaybookCover(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Cover must be an image.");
  }

  const uploadFile = await compressImage(file);
  const extension = getFileExtension(uploadFile.name, "image");
  const path = `${userId}/covers/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(playbookMediaBucket)
    .upload(path, uploadFile, {
      cacheControl: "31536000",
      contentType: uploadFile.type,
      upsert: false,
    });

  if (error) throw error;

  return path;
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

export function getLinkItemType(value: string): PlaybookItemType {
  if (getYouTubeVideoId(value)) return "youtube";
  return isImageUrl(value) ? "image" : "link";
}

async function getSignedUrls(paths: string[]) {
  const urls = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(playbookMediaBucket)
        .createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) urls.set(path, data.signedUrl);
    }),
  );
  return urls;
}

async function compressImage(file: File) {
  const image = await loadImage(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");

  if (!context) return file;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );

  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded."));
    };
    image.src = url;
  });
}

function normalizeItemType(value: string | null): PlaybookItemType {
  if (
    value === "youtube" ||
    value === "video" ||
    value === "image" ||
    value === "file" ||
    value === "link" ||
    value === "text"
  ) {
    return value;
  }

  return "text";
}

function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? "";
      return url.searchParams.get("v") ?? "";
    }
  } catch {
    return "";
  }

  return "";
}

function getFileExtension(name: string, type: PlaybookItemType) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension) return extension;
  if (type === "image") return "webp";
  if (type === "video") return "mp4";
  return "bin";
}

function isImageUrl(value: string) {
  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(value);
}
