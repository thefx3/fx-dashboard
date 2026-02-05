"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeProjectIcon } from "@/lib/projects/icons";

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
  const icon = normalizeProjectIcon(String(formData.get("icon") ?? ""));
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
      .insert({ user_id: user.id, name, slug: finalSlug, icon })
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

async function updateProjectInternal(formData: FormData, forceSlugUpdate: boolean) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const icon = normalizeProjectIcon(String(formData.get("icon") ?? ""));
  const currentSlug = String(formData.get("current_slug") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;

  if (userErr || !user) throw new Error("Not authenticated");

  const updateBase = async (payload: { name: string; icon: string; slug?: string }) => {
    return supabase
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("slug")
      .single();
  };

  if (forceSlugUpdate) {
    let newSlug = slugify(name);
    if (!newSlug) newSlug = "project";
    let finalSlug = currentSlug || newSlug;

    if (currentSlug && currentSlug === newSlug) {
      const { data, error } = await updateBase({ name, icon });
      if (error) throw error;
      finalSlug = data?.slug ?? finalSlug;
    } else {
      let result = await updateBase({ name, icon, slug: newSlug });

      if (result.error?.code === "23505") {
        result = await updateBase({ name, icon, slug: withSuffix(newSlug) });
      }

      if (result.error) throw result.error;
      finalSlug = result.data?.slug ?? newSlug;
    }
    revalidatePath("/projects");
  } else {
    const { error } = await updateBase({ name, icon });
    if (error) throw error;
  }

  revalidatePath("/projects");
}

export async function updateProject(formData: FormData) {
  return updateProjectInternal(formData, false);
}

export async function updateProjectWithSlug(formData: FormData) {
  return updateProjectInternal(formData, true);
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
