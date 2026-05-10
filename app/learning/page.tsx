import Link from "next/link";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

const tracks = [
  ["piano", "Piano", "Technique, repertoire, theorie et pratique."],
  ["trading", "Trading", "Journal, setups, theses et reviews."],
  ["tennis", "Tennis", "Service, footwork, matchs et physique."],
  ["knitting", "Knitting", "Patterns, matieres, projets et avancement."],
  ["languages", "Languages", "Vocabulaire, oral, grammaire et immersion."],
];

export default function LearningPage() {
  return (
    <main className="min-h-screen bg-site text-site">
      <PublicHeader />
      <section className="fp-container py-16 sm:py-20">
        <div className="max-w-2xl">
          <span className="fp-icon">
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-8">Learning</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
            Un hub pour apprendre proprement.
          </h1>
          <p className="mt-5 text-base leading-7 text-site-muted">
            Chaque discipline garde son espace, ses objectifs et sa logique de
            progression.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {tracks.map(([slug, title, text]) => (
            <Link key={slug} href={`/learning/${slug}`} className="surface p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-site-muted">{text}</p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                Open track
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
