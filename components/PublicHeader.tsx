import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { getViewerServer } from "@/lib/auth/viewer.server";
import { cn } from "@/lib/cn";

const links = [
  { href: "/#mission", label: "MISSION" },
  { href: "/#progress", label: "PROGRESS" },
  { href: "/#playbooks", label: "PLAYBOOKS" },
];

type PublicHeaderProps = {
  variant?: "solid" | "overlay";
};

export default async function PublicHeader({ variant = "solid" }: PublicHeaderProps) {
  const isOverlay = variant === "overlay";
  const { user } = await getViewerServer();

  return (
    <header
      className={cn(
        "z-50 w-full",
        isOverlay
          ? "absolute left-0 top-0 text-white"
          : "sticky top-0 border-b border-site bg-site/90 text-site backdrop-blur-xl",
      )}
    >
      <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8 lg:px-10">
        <BrandMark
          tone="dark"
          priority={isOverlay}
          className={cn("justify-self-start", isOverlay && "text-white")}
        />

        <nav
          className="hidden items-center gap-8 justify-self-center md:flex"
          aria-label="Main navigation"
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", isOverlay && "nav-link-overlay")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={user ? "/dashboard" : "/dashboard/login"}
          className={cn(
            "admin-button justify-self-end",
            isOverlay
              ? "admin-button-overlay"
              : "admin-button-solid",
          )}
        >
          {user ? "ADMIN" : "LOGIN"}
        </Link>
      </div>
    </header>
  );
}
