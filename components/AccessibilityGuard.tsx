"use client";

import { useEffect } from "react";

export default function AccessibilityGuard() {
  useEffect(() => {
    const repairMainLandmarks = () => {
      document.querySelectorAll("main[aria-hidden='true']").forEach((main) => {
        main.removeAttribute("aria-hidden");
      });
    };

    repairMainLandmarks();

    const observer = new MutationObserver(repairMainLandmarks);
    observer.observe(document.body, {
      attributeFilter: ["aria-hidden"],
      attributes: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
