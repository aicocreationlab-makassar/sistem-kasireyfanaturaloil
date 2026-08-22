import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@/lib/types";

export function Topbar({ profile }: { profile: Profile }) {
  const initials = profile.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EY";
  return <header className="topbar"><div className="topbar-inner">
    <Link href="/dashboard" className="brand" aria-label="Dashboard EYFA">
      <Image src="/logo-eyfa.png" width={64} height={64} alt="Logo EYFA" priority />
      <div><div className="brand-name">EYFA</div><div className="brand-sub">POS & INVENTORY</div></div>
    </Link>
    <div className="user-chip">
      <div className="user-copy"><div className="user-name">{profile.full_name}</div><div className="user-role">{profile.role}</div></div>
      <div className="avatar" aria-hidden="true">{initials}</div>
    </div>
  </div></header>;
}

export function TopbarSkeleton() {
  return <header className="topbar" aria-label="Memuat informasi akun">
    <div className="topbar-inner motion-safe:animate-pulse">
      <div className="brand" aria-hidden="true">
        <div style={{ width: 43, height: 43, borderRadius: "50%", background: "var(--line)" }} />
        <div>
          <div style={{ width: 56, height: 12, borderRadius: 8, background: "var(--line)" }} />
          <div style={{ width: 92, height: 8, marginTop: 7, borderRadius: 8, background: "var(--line)" }} />
        </div>
      </div>
      <div className="avatar" style={{ background: "var(--line)" }} aria-hidden="true" />
    </div>
  </header>;
}
