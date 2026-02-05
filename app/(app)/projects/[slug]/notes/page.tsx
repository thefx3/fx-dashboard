import NotesView from "./NotesView";

export default function NotesPage({
  params,
  searchParams,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams?: { tasks?: string } | Promise<{ tasks?: string }>;
}) {
  return <NotesView params={params} searchParams={searchParams} />;
}
