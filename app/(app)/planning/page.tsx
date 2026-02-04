import { createClient } from "@/lib/supabase/server";
import { TasksView } from "./TasksView";
import { TaskRow } from "./utils";

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return null;
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,content,category,due_date,status,created_at")
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) throw error;

  return (
    <div className="w-full">
      <TasksView tasks={tasks ?? []} />
    </div>
  );
}
