import ProjectsNavServer from "@/components/projects/ProjectsNavServer";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="flex w-full flex-1 min-h-0 flex-col lg:flex-row">
        <div className="w-full min-h-0">{children}</div>
      </div>
    </div>
  );
}
