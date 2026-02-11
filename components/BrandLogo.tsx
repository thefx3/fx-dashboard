"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type BrandLogoProps = {
  size: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export default function BrandLogo({
  size,
  className = "",
  priority = false,
  alt = "Logo",
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const src = isDark ? "/logo-dark.png" : "/logo-light.png";

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
