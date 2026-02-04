import ProjectTab from "@/components/projects/ProjectTab";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);

  return (
    <div className="h-full">
      <ProjectTab slug={resolvedParams.slug} />
      {children}
    </div>
  );
}
