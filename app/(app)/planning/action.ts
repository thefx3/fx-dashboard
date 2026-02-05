"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskStatus, isTaskStatus } from "./utils";

export async function addTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();

  if (!title) return;

  const { supabase, userId } = await requireUser();

  const due_date = dueDateRaw ? dueDateRaw : null;

  const { error: insertErr } = await supabase.from("tasks").insert({
    user_id: userId,
    title,
    content: content || null,
    category: category || null,
    due_date,
    status: "todo",
  });

  if (insertErr) throw insertErr;

  revalidatePath("/planning");
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  projectId?: string | null
) {
  const { supabase, userId } = await requireUser();

  const updatePayload: { status: TaskStatus; project_id?: string } = { status };
  if (projectId) {
    updatePayload.project_id = projectId;
  }

  const { error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath("/planning");
}

export async function deleteTask(taskId: string) {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/planning");
}

export async function updateTask(taskId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();

  if (!title) return;

  const { supabase, userId } = await requireUser();

  const due_date = dueDateRaw ? dueDateRaw : null;
  const status = isTaskStatus(statusRaw) ? statusRaw : "todo";

  const updatePayload: {
    title: string;
    content: string | null;
    category: string | null;
    due_date: string | null;
    status: TaskStatus;
    project_id?: string;
  } = {
    title,
    content: content || null,
    category: category || null,
    due_date,
    status,
  };

  if (projectId) {
    updatePayload.project_id = projectId;
  }

  const { error: updateErr } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("user_id", userId);

  if (updateErr) throw updateErr;

  revalidatePath("/planning");
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}
