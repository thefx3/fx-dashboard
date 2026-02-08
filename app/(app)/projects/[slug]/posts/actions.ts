"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import type { ActivityType } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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

export async function createPost(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const activity_type = String(formData.get("activity_type") ?? "other") as ActivityType;

  const happened_on = String(formData.get("happened_on") ?? "").trim(); // YYYY-MM-DD
  const durationHhmm = String(formData.get("duration_hhmm") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const durationUnit = String(formData.get("duration_unit") ?? "min").trim();
  const segmentNameRaw = String(formData.get("segment_name") ?? "");

  if (!slug) throw new Error("Missing slug");
  if (!content) return; // pas de post vide

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
  const { error: insertErr } = await supabase.from("project_posts").insert({
    project_id: project.id,
    user_id: user.id,
    segment_id,
    title: title || null,
    content,
    activity_type,
    duration_minutes,
    happened_on: happened_on || undefined, // si vide -> default DB current_date
  });

  if (insertErr) throw insertErr;

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

  // delete sécurisé par RLS (user_id = auth.uid()) si tu as gardé les policies
  const { error } = await supabase.from("project_posts").delete().eq("id", postId);
  if (error) throw error;

  revalidatePath(`/projects/${slug}/posts`);
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
