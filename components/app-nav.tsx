"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, LoaderCircle, PackageSearch, Settings, ShoppingBasket, type LucideIcon } from "lucide-react";
import { PoweredBy } from "@/components/powered-by";

const links = [
  { href: "/cashier", label: "Kasir", icon: ShoppingBasket },
  { href: "/inventory", label: "Stok", icon: Boxes },
  { href: "/reports", label: "Laporan", icon: ClipboardList },
  { href: "/products", label: "Produk", icon: PackageSearch },
  { href: "/settings", label: "Menu", icon: Settings },
];

function NavContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return <>
    {pending
      ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
      : <Icon aria-hidden="true" />}
    <span>{label}</span>
    {pending && <span className="sr-only">Memuat halaman</span>}
  </>;
}

export function AppNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Navigasi utama">
    <PoweredBy className="sidebar-powered-by" />
    <div className="nav-inner">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
          <NavContent icon={Icon} label={label} />
        </Link>;
      })}
    </div>
  </nav>;
}
