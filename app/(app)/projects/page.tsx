import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject, deleteProject, updateProject } from "./actions";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export default async function ProjectsIndexPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,slug,name,created_at")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error && error.code !== "PGRST205") throw error;

  const safeProjects = projects ?? [];

  return (
    <div className="w-full p-2">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {safeProjects.map((project) => {
          const projectHref = `/projects/${project.slug}/posts`;
          return (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={projectHref}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Créé le {new Date(project.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={projectHref}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted"
                  >
                    Ouvrir
                  </Link>

                  <details className="relative">
                    <summary className="list-none inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted">
                      Modifier
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-border bg-background p-3 shadow-lg">
                      <form action={updateProject} className="flex flex-col gap-2">
                        <input type="hidden" name="id" value={project.id} />
                        <input
                          name="name"
                          defaultValue={project.name}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
                          Enregistrer
                        </button>
                      </form>
                    </div>
                  </details>

                  <form action={deleteProject}>
                    <input type="hidden" name="id" value={project.id} />
                    <button className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/50 px-3 text-xs text-destructive hover:bg-destructive/10">
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-border bg-card p-4">
          <div className="text-sm font-medium">Ajouter un projet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Crée un nouveau projet pour commencer.
          </p>
          <form action={createProject} className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom du projet"
              className="h-10 rounded-md border border-input bg-background px-3"
            />
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-primary-foreground">
              Créer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
