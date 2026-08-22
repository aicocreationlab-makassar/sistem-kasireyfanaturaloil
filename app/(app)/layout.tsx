import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { ToastProvider } from "@/components/toast-provider";
import { Topbar, TopbarSkeleton } from "@/components/topbar";
import { getSessionContext } from "@/lib/data";

export const dynamic = "force-dynamic";

async function SessionTopbar() {
  const { profile } = await getSessionContext();
  return <Topbar profile={profile} />;
}

export default function OperationalLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>
    <Suspense fallback={<TopbarSkeleton />}>
      <SessionTopbar />
    </Suspense>
    <div className="app-shell">{children}</div>
    <AppNav />
  </ToastProvider>;
}
