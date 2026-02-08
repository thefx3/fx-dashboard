"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import type { ActivityType } from "./types";

const ATTACHMENTS_BUCKET = "project-posts";
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 80;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type UploadResult = {
  kind: "image" | "video" | "file";
  storage_path: string;
  public_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
};

type PreparedUpload = {
  body: File | Buffer;
  contentType: string;
  fileName: string;
  sizeBytes: number;
};

//UPLOADS
function toUploadFiles(values: FormDataEntryValue[]) {
  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

function resolveAttachmentKind(file: File): UploadResult["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function buildStoragePath(userId: string, projectId: string, postId: string, file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const safeExt = ext ? `.${ext.toLowerCase()}` : "";
  return `${userId}/${projectId}/${postId}/${crypto.randomUUID()}${safeExt}`;
}

async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (!file.type.startsWith("image/")) {
    return {
      body: file,
      contentType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  let sharpLib: typeof import("sharp") | null = null;
  try {
    const mod = await import("sharp");
    sharpLib = (mod.default ?? mod) as typeof import("sharp");
  } catch {
    return {
      body: file,
      contentType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  if (!sharpLib) {
    return {
      body: file,
      contentType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let pipeline = sharpLib(inputBuffer)
    .rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });

  if (file.type === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true });
  } else if (file.type === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 8 });
  } else if (file.type === "image/webp") {
    pipeline = pipeline.webp({ quality: IMAGE_QUALITY });
  } else if (file.type === "image/avif") {
    pipeline = pipeline.avif({ quality: IMAGE_QUALITY });
  }

  const outputBuffer = await pipeline.toBuffer();

  if (outputBuffer.length >= inputBuffer.length) {
    return {
      body: file,
      contentType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  return {
    body: outputBuffer,
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
    sizeBytes: outputBuffer.length,
  };
}

async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  postId: string,
  file: File
): Promise<UploadResult> {
  const prepared = await prepareUpload(file);
  const storage_path = buildStoragePath(userId, projectId, postId, file);
  const { error: uploadErr } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storage_path, prepared.body, {
      contentType: prepared.contentType,
      upsert: false,
    });

  if (uploadErr) throw uploadErr;

  const { data: publicData } = supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .getPublicUrl(storage_path);

  return {
    kind: resolveAttachmentKind(file),
    storage_path,
    public_url: publicData.publicUrl,
    file_name: prepared.fileName,
    mime_type: prepared.contentType || null,
    size_bytes: prepared.sizeBytes,
  };
}


//POSTS
export async function createPost(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const activity_type = String(formData.get("activity_type") ?? "other") as ActivityType;

  const happened_on = String(formData.get("happened_on") ?? "").trim(); // YYYY-MM-DD
  const happened_time = String(formData.get("happened_time") ?? "").trim(); // HH:mm (optionnel)
  const durationHhmm = String(formData.get("duration_hhmm") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const durationUnit = String(formData.get("duration_unit") ?? "min").trim();
  const segmentNameRaw = String(formData.get("segment_name") ?? "");

  if (!slug) throw new Error("Missing slug");

  let duration_minutes: number | null = null;
  if (durationHhmm) {
    const [hh, mm] = durationHhmm.split(":");
    const hours = Number(hh);
    const minutes = Number(mm);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const total = hours * 60 + minutes;
      duration_minutes = total >= 0 ? total : null;
    }
  } else if (durationRaw) {
    const durationValue = Number(durationRaw);
    if (Number.isFinite(durationValue)) {
      const minutes = durationUnit === "h" ? durationValue * 60 : durationValue;
      const rounded = Math.round(minutes);
      duration_minutes = rounded >= 0 ? rounded : null;
    }
  }

  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;
  if (userErr || !user) throw new Error("Not authenticated");

  // 1) retrouver le projet (sécurité : slug + user_id)
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (projErr || !project) throw new Error("Project not found");

  // 2) segment (optionnel): réutiliser si existe déjà, sinon créer
  const segment_id = await resolveSegmentId(
    supabase,
    project.id,
    user.id,
    segmentNameRaw
  );

  // 3) insert post
  const happened_on_value =
    happened_on && happened_time ? `${happened_on}T${happened_time}:00` : happened_on || undefined;

  const { data: newPost, error: insertErr } = await supabase
    .from("project_posts")
    .insert({
    project_id: project.id,
    user_id: user.id,
    segment_id,
    title: title || null,
    content,
    activity_type,
    duration_minutes,
    happened_on: happened_on_value, // date ou date+heure
    })
    .select("id")
    .single();

  if (insertErr) throw insertErr;

  const postId = newPost.id;
  const attachments: UploadResult[] = [];

  const photoFiles = toUploadFiles(formData.getAll("attachment_photos"));
  const videoFiles = toUploadFiles(formData.getAll("attachment_videos"));
  const fileEntry = formData.get("attachment_file");
  const fileFiles = fileEntry instanceof File && fileEntry.size > 0 ? [fileEntry] : [];

  for (const file of [...photoFiles, ...videoFiles, ...fileFiles]) {
    const uploaded = await uploadAttachment(supabase, user.id, project.id, postId, file);
    attachments.push(uploaded);
  }

  if (attachments.length > 0) {
    const { error: attachmentErr } = await supabase.from("project_post_attachments").insert(
      attachments.map((item) => ({
        project_id: project.id,
        user_id: user.id,
        post_id: postId,
        kind: item.kind,
        storage_path: item.storage_path,
        public_url: item.public_url,
        file_name: item.file_name,
        mime_type: item.mime_type,
        size_bytes: item.size_bytes,
      }))
    );

    if (attachmentErr) throw attachmentErr;
  }

  revalidatePath(`/projects/${slug}/posts`);
}

export async function deletePost(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const postId = String(formData.get("post_id") ?? "").trim();
  if (!slug || !postId) return;

  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;
  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("project_posts").delete().eq("id", postId);
  if (error) throw error;

  revalidatePath(`/projects/${slug}/posts`);
}


//SEGMENTS
async function resolveSegmentId(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  rawSegmentName: string
) {
  const segment_name = sanitizeSegmentName(rawSegmentName);
  if (!segment_name) return null;

  const inputKey = normalizeSegmentKey(segment_name);
  const inputSlug = slugifySegment(segment_name);

  const { data: segments, error: segErr } = await supabase
    .from("project_segments")
    .select("id,name,slug")
    .eq("project_id", projectId);

  if (segErr) throw segErr;

  const existing = (segments ?? []).find((segment) => {
    if (segment.slug && inputSlug && segment.slug === inputSlug) return true;
    const existingKey = normalizeSegmentKey(segment.name ?? "");
    return existingKey && existingKey === inputKey;
  });

  if (existing) return existing.id;
  if (!inputSlug) return null;

  const { data: newSegment, error: insertSegErr } = await supabase
    .from("project_segments")
    .insert({
      project_id: projectId,
      user_id: userId,
      name: segment_name,
      slug: inputSlug,
    })
    .select("id")
    .single();

  if (insertSegErr) {
    if (insertSegErr.code === "23505") {
      const { data: retrySegment, error: retryErr } = await supabase
        .from("project_segments")
        .select("id")
        .eq("project_id", projectId)
        .eq("slug", inputSlug)
        .single();
      if (retryErr) throw retryErr;
      return retrySegment.id;
    }
    throw insertSegErr;
  }

  return newSegment.id;
}

function sanitizeSegmentName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSegmentKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugifySegment(value: string) {
  const key = normalizeSegmentKey(value);
  return key ? key.replace(/\s+/g, "-") : "";
}
