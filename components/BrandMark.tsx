import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  href?: string;
  tone?: "light" | "dark";
  label?: string;
  className?: string;
  priority?: boolean;
};

export default function BrandMark({
  href = "/",
  label = "F PAIR_",
  className,
  priority = false,
}: BrandMarkProps) {
  const logo = {
    svg: "/brand/fp-dark.svg",
    png: "/brand/fp-dark.png",
  };

  return (
    <Link
      href={href}
      className={cn("inline-flex min-w-0 items-center gap-3", className)}
    >
      <picture className="h-10 w-10 shrink-0">
        <source srcSet={logo.svg} type="image/svg+xml" />
        <img
          src={logo.png}
          alt="F PAIR logo"
          width={40}
          height={40}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className="h-full w-full object-contain"
        />
      </picture>
      <span className="truncate text-sm font-semibold uppercase tracking-[0.24em]">
        {label}
      </span>
    </Link>
  );
}
