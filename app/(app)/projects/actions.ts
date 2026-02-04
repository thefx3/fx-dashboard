"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // accents
    .replace(/[^a-z0-9]+/g, "-")       // non alphanum -> -
    .replace(/^-+|-+$/g, "")           // trim -
    .slice(0, 60);
}

function withSuffix(slug: string) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;

  if (userErr || !user) throw new Error("Not authenticated");

  let slug = slugify(name);
  if (!slug) slug = "project";

  // Essai insert, si collision -> suffix
  const tryInsert = async (finalSlug: string) => {
    return supabase
      .from("projects")
      .insert({ user_id: user.id, name, slug: finalSlug })
      .select("slug")
      .single();
  };

  let inserted = await tryInsert(slug);

  // collision unique (slug déjà pris pour ce user)
  if (inserted.error?.code === "23505") {
    inserted = await tryInsert(withSuffix(slug));
  }

  if (inserted.error) throw inserted.error;

  revalidatePath("/projects");
  redirect(`/projects/${inserted.data.slug}/posts`);
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;

  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;

  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/projects");
}
