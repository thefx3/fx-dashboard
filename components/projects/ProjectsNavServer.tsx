import ProjectsNav from "@/components/projects/ProjectsNav";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string | null;
  title: string | null;
};

export default async function ProjectsNavServer() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id,slug,name,title")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  const projects = error?.code === "PGRST205" ? [] : data ?? [];

  return <ProjectsNav projects={projects} />;
}
