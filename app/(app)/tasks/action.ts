"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TaskStatus } from "./utils";
import { nextStatus } from "./utils";

export async function addTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();

  if (!title) return;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) throw new Error("Not authenticated");

  const due_date = dueDateRaw ? dueDateRaw : null;

  const { error: insertErr } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    content: content || null,
    category: category || null,
    due_date,
    status: "todo",
  });

  if (insertErr) throw insertErr;

  revalidatePath("/tasks");
}


export async function cycleTaskStatus(taskId: string, current: TaskStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus(current) })
    .eq("id", taskId);

  if (error) throw error;

  revalidatePath("/tasks");
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) throw error;

  revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;

  revalidatePath("/tasks");
}

export async function updateTask(taskId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();

  if (!title) return;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) throw new Error("Not authenticated");

  const due_date = dueDateRaw ? dueDateRaw : null;
  const status = isTaskStatus(statusRaw) ? statusRaw : "todo";

  const { error: updateErr } = await supabase
    .from("tasks")
    .update({
      title,
      content: content || null,
      category: category || null,
      due_date,
      status,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (updateErr) throw updateErr;

  revalidatePath("/tasks");
}

function isTaskStatus(value: string): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done" || value === "unfinished";
}
