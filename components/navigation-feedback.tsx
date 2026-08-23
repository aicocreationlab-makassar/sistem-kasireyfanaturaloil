"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [locationKey]);

  useEffect(() => {
    function start() {
      setPending(true);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      start();
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.method.toLowerCase() !== "get") return;
      start();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-navigating", pending);
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return <div className={`navigation-progress ${pending ? "visible" : ""}`} role="progressbar" aria-label="Memuat halaman" />;
}
