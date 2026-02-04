import { redirect } from "next/navigation";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  if (!params?.slug) redirect("/projects");
  redirect(`/projects/${params.slug}/posts`);
}
