import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string | null;
  title: string | null;
  icon: string | null;
};

export default async function NavBarServer() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id,slug,name,title,icon")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  const projects = error?.code === "PGRST205" ? [] : data ?? [];

  return <NavBar projects={projects} />;
}
