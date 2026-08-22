import { AppNav } from "@/components/app-nav";
import { Topbar } from "@/components/topbar";
import { getSessionContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OperationalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionContext();
  return <><Topbar profile={profile} /><div className="app-shell">{children}</div><AppNav /></>;
}
