import NotesView from "./NotesView";

export default function NotesPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  return <NotesView params={params} />;
}
