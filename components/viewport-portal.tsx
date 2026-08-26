"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders overlays directly under document.body so transformed/scrolling page containers cannot trap them. */
export function ViewportPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
