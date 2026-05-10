import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

const topics: Record<string, { title: string; items: string[] }> = {
  piano: { title: "Piano", items: ["Technique", "Repertoire", "Theory"] },
  trading: { title: "Trading", items: ["Journal", "Setups", "Review"] },
  tennis: { title: "Tennis", items: ["Serve", "Footwork", "Match play"] },
  knitting: { title: "Knitting", items: ["Patterns", "Materials", "Progress"] },
  languages: { title: "Languages", items: ["Vocabulary", "Speaking", "Immersion"] },
};

export function generateStaticParams() {
  return Object.keys(topics).map((topic) => ({ topic }));
}

export default async function LearningTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const data = topics[topic];
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-site text-site">
      <PublicHeader />
      <section className="fp-container py-16 sm:py-20">
        <Link
          href="/learning"
          className="inline-flex items-center gap-2 text-sm font-bold text-site-muted hover:text-site"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Learning
        </Link>
        <div className="mt-10 max-w-2xl">
          <span className="fp-icon">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-8">{data.title}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
            {data.title} track
          </h1>
          <p className="mt-5 text-base leading-7 text-site-muted">
            Une page publique simple, prete a etre enrichie avec les donnees du
            dashboard.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {data.items.map((item) => (
            <article key={item} className="surface p-6">
              <p className="eyebrow">Focus</p>
              <h2 className="mt-4 text-xl font-semibold">{item}</h2>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
