"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, PackageSearch, Settings, ShoppingBasket } from "lucide-react";

const links = [
  { href: "/cashier", label: "Kasir", icon: ShoppingBasket },
  { href: "/inventory", label: "Stok", icon: Boxes },
  { href: "/reports", label: "Laporan", icon: ClipboardList },
  { href: "/products", label: "Produk", icon: PackageSearch },
  { href: "/settings", label: "Menu", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Navigasi utama"><div className="nav-inner">
    {links.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
        <Icon aria-hidden="true" /><span>{label}</span>
      </Link>;
    })}
  </div></nav>;
}
