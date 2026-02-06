import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProjectEditDetails from "@/components/projects/ProjectEditDetails";
import ProjectIconPicker from "@/components/projects/ProjectIconPicker";
import ProjectDeleteDialog from "@/components/projects/ProjectDeleteDialog";
import { DEFAULT_PROJECT_ICON } from "@/lib/projects/icons";
import { createProject, deleteProject, updateProject, updateProjectWithSlug } from "./actions";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  icon: string | null;
};

export default async function ProjectsIndexPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,slug,name,created_at,icon")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error && error.code !== "PGRST205") throw error;

  const safeProjects = projects ?? [];

  return (
    <div className="w-full p-2 sm:p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {safeProjects.map((project) => {
          const projectHref = `/projects/${project.slug}/posts`;
          return (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={projectHref}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created on {new Date(project.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <Link
                    href={projectHref}
                    className="inline-flex h-8 w-full items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted sm:w-auto"
                  >
                    Open
                  </Link>

                  <ProjectEditDetails
                    projectId={project.id}
                    defaultName={project.name}
                    defaultSlug={project.slug}
                    defaultIcon={project.icon ?? DEFAULT_PROJECT_ICON}
                    updateAction={updateProject}
                    updateSlugAction={updateProjectWithSlug}
                  />

                  <ProjectDeleteDialog
                    projectId={project.id}
                    projectName={project.name}
                    deleteAction={deleteProject}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-border bg-card p-4">
          <div className="text-sm font-medium">Add a new project</div>
          <form action={createProject} className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom du projet"
              className="h-10 rounded-md border border-input bg-background px-3"
            />
            <ProjectIconPicker name="icon" defaultValue={DEFAULT_PROJECT_ICON} />
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-primary-foreground">
              Create
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
