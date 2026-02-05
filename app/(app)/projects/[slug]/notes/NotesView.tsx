import ProjectNotesEditor from "@/components/projects/ProjectNotesEditor";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ProjectRow = {
  id: string;
  name: string | null;
  notes?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: "todo" | "done" | "doing" | "unfinished";
  created_at: string;
};

export default async function NotesView({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData.user;
  if (userErr || !user) return null;

  let project: ProjectRow | null = null;
  let projectError: { code?: string } | null = null;

  const projectWithNotes = await supabase
    .from("projects")
    .select("id,name,notes")
    .eq("user_id", user.id)
    .eq("slug", resolvedParams.slug)
    .maybeSingle<ProjectRow>();

  if (projectWithNotes.error?.code === "42703") {
    const projectFallback = await supabase
      .from("projects")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("slug", resolvedParams.slug)
      .maybeSingle<ProjectRow>();
    project = projectFallback.data ?? null;
    projectError = projectFallback.error;
  } else {
    project = projectWithNotes.data ?? null;
    projectError = projectWithNotes.error;
  }

  if (projectError) throw projectError;
  if (!project) return null;

  const tasksResponse = await supabase
    .from("tasks")
    .select("id,title,status,created_at")
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  const tasksColumnMissing = tasksResponse.error?.code === "42703";
  if (tasksResponse.error && !tasksColumnMissing) throw tasksResponse.error;

  const tasks = tasksColumnMissing ? [] : tasksResponse.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-semibold uppercase tracking-widest">Taches a faire</div>

          {tasksColumnMissing ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Ajoute la colonne <code>project_id</code> dans <code>tasks</code> pour activer les
              taches par projet.
            </p>
          ) : (
            <>
              <form
                action={addProjectTask}
                className="mt-4 flex items-center gap-2"
              >
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="project_slug" value={resolvedParams.slug} />
                <input
                  name="title"
                  required
                  placeholder="Nouvelle tache"
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
                  Ajouter
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune tache pour ce projet.</p>
                ) : (
                  tasks.map((task) => {
                    const isDone = task.status === "done";
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                      >
                        <form action={setProjectTaskStatus}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="project_slug" value={resolvedParams.slug} />
                          <input
                            type="hidden"
                            name="status"
                            value={isDone ? "todo" : "done"}
                          />
                          <button
                            className="h-5 w-5 rounded border border-border"
                            aria-label={isDone ? "Marquer comme a faire" : "Marquer comme termine"}
                          />
                        </form>
                        <span className={isDone ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                          {task.title}
                        </span>
                        <form action={deleteProjectTask} className="ml-auto">
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="project_slug" value={resolvedParams.slug} />
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-semibold uppercase tracking-widest">Notes</div>
          <div className="mt-4">
            <ProjectNotesEditor
              projectId={project.id}
              projectSlug={resolvedParams.slug}
              initialContent={project.notes ?? ""}
              saveAction={updateProjectNotes}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

async function requireUser() {
  "use server";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addProjectTask(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const projectSlug = String(formData.get("project_slug") ?? "").trim();

  if (!title || !projectId) return;

  const { supabase, userId } = await requireUser();

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title,
    status: "todo",
    project_id: projectId,
  });

  if (error) throw error;

  if (projectSlug) revalidatePath(`/projects/${projectSlug}/notes`);
}

export async function setProjectTaskStatus(formData: FormData) {
  "use server";
  const taskId = String(formData.get("task_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const projectSlug = String(formData.get("project_slug") ?? "").trim();

  if (!taskId || (status !== "todo" && status !== "done")) return;

  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;

  if (projectSlug) revalidatePath(`/projects/${projectSlug}/notes`);
}

export async function deleteProjectTask(formData: FormData) {
  "use server";
  const taskId = String(formData.get("task_id") ?? "").trim();
  const projectSlug = String(formData.get("project_slug") ?? "").trim();
  if (!taskId) return;

  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;

  if (projectSlug) revalidatePath(`/projects/${projectSlug}/notes`);
}

export async function updateProjectNotes(
  projectId: string,
  content: string,
  projectSlug?: string
) {
  "use server";
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from("projects")
    .update({ notes: content })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw error;

  if (projectSlug) revalidatePath(`/projects/${projectSlug}/notes`);
}
