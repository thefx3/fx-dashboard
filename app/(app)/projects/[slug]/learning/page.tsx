import LearningView from "./LearningView";

export default function LearningPage({
  params
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  return (
    <div className="p-6">

        <LearningView params={params} />
        </div>
    )
}