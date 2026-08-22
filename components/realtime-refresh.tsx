"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ tables }: { tables: Array<"products" | "sales"> }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`screen-${tables.join("-")}-${Math.random().toString(36).slice(2)}`);
    tables.forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      clearTimeout(timeout); timeout = setTimeout(() => router.refresh(), 180);
    }));
    channel.subscribe();
    return () => { clearTimeout(timeout); void supabase.removeChannel(channel); };
  }, [router, tables]);
  return null;
}
