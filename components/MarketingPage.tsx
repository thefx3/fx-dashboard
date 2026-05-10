import type { LucideIcon } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

export type MarketingItem = {
  title: string;
  text: string;
  icon: LucideIcon;
};

type MarketingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: MarketingItem[];
};

export default function MarketingPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  items,
}: MarketingPageProps) {
  return (
    <main className="min-h-screen bg-site text-site">
      <PublicHeader />
      <section className="fp-container py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div className="max-w-2xl">
            <span className="fp-icon">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="eyebrow mt-8">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
              {title}
            </h1>
          </div>
          <p className="max-w-2xl text-base leading-7 text-site-muted lg:justify-self-end">
            {description}
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <article key={item.title} className="surface p-6">
                <span className="fp-icon">
                  <ItemIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-10 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-site-muted">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
