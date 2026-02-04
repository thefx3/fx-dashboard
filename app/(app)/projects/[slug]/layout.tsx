import ProjectTab from "@/components/projects/ProjectTab";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div className="h-full">
      <ProjectTab slug={params.slug} />
      {children}
    </div>
  );
}
