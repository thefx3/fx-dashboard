"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import icon from "@/app/icon.png";
import { APP_NAV, APPS, type AppKey } from "@/lib/app";

type NavBarProps = {
  appKey?: AppKey;
};

export default function NavBar({ appKey = "main" }: NavBarProps) {
  const pathname = usePathname();
const navLinkClass =
  "group inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition hover:bg-primary/20 hover:text-foreground";

const navLinkActiveClass =
  " shadow-sm ring-1 ring-primary/30 hover:bg-accent/90 bg-foreground text-accent";

  const links = APP_NAV[appKey] ?? [];
  const app = APPS.find((item) => item.key === appKey);
  const activeRingClass = app?.colorClass
    ? app.colorClass.replace(/^text-/, "ring-")
    : "ring-slate-900/20";

  return (
    <aside className="hidden h-screen w-full shrink-0 border-r border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur lg:flex lg:w-64 lg:flex-col">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-4 px-6 pt-6 text-lg font-semibold uppercase tracking-[0.25em] text-foreground"
      >
        <Image
          src={icon}
          alt="Logo"
          width={45}
          height={45}
          className={`h-14 w-14  ${activeRingClass}`}
          priority
        />
        <span className="text-2xl text-foreground">AIO</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-3 px-4 pb-6">
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
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.Icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${navLinkClass} ${isActive ? navLinkActiveClass : "text-muted-foreground"}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? "text-accent" : "group-hover:text-primary"
                }`}
                aria-hidden
              />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
