"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { APP_NAV, APPS, type AppKey } from "@/lib/app";
import BrandLogo from "@/components/BrandLogo";

type MobileNavProps = {
  appKey?: AppKey;
};

export default function MobileNav({ appKey = "main" }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = APP_NAV[appKey] ?? [];
  const app = APPS.find((item) => item.key === appKey);
  const activeRingClass = app?.colorClass
    ? app.colorClass.replace(/^text-/, "ring-")
    : "ring-slate-900/20";
  const logoWrapClass = "relative inline-flex h-9 w-9 items-center justify-center";
  const logoImageClass = "h-9 w-9 object-contain";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const navLinkClass =
    "group inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition hover:bg-accent/10 hover:text-accent";
  const navLinkActiveClass =
    "shadow-sm ring-1 ring-primary/30 hover:bg-accent/10 bg-foreground text-accent";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] isolate bg-background text-foreground shadow-2xl ring-1 ring-border/40">
            <div className="flex items-center justify-between px-4 py-4">
              <Link
                href="/"
                className="inline-flex items-center gap-3 text-lg font-semibold uppercase tracking-[0.25em]"
                onClick={() => setOpen(false)}
              >
                <span className={logoWrapClass}>
                  <BrandLogo
                    size={36}
                    className={`${logoImageClass} ${activeRingClass}`}
                    priority
                  />
                </span>
                <span className="text-xl">AIO</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer hover:scale-103 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
                aria-label="Fermer le menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="bg-background flex flex-col gap-3 px-4 pb-6">
              {links.map((link) => {
                const isInbox = link.href === "/";
                const otherLinks = links
                  .map((item) => item.href)
                  .filter((href) => href !== "/");
                const isActive = isInbox
                  ? pathname === "/" ||
                    !otherLinks.some(
                      (href) =>
                        pathname === href || pathname.startsWith(`${href}/`),
                    )
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
                const Icon = link.Icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`${navLinkClass} ${isActive ? navLinkActiveClass : "text-muted-foreground"}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-accent" : "group-hover:text-accent"
                      }`}
                      aria-hidden
                    />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
