"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { label: "Feed", segment: "posts" },
  { label: "Learning", segment: "learning" },
  { label: "Resources", segment: "resources" },
  { label: "Stats", segment: "stats" },
  { label: "Notes", segment: "notes" },
  { label: "Settings", segment: "settings" },
];

export default function ProjectTab({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedSlug = slug ?? (pathname ? pathname.split("/")[2] : undefined);

  if (!resolvedSlug) return null;

  useEffect(() => {
    const hrefs = TABS.map((tab) => `/projects/${resolvedSlug}/${tab.segment}`);
    hrefs.forEach((href) => router.prefetch(href));
  }, [resolvedSlug, router]);

  return (
    <div className="min-h-12 w-full shrink-0 border-b border-border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8">
      {TABS.map((tab) => {
        const href = `/projects/${resolvedSlug}/${tab.segment}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center justify-center text-md transition px-2",
              isActive ? "bg-accent/10 font-semibold border-b-4 border-accent" : "hover:bg-accent/10",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
