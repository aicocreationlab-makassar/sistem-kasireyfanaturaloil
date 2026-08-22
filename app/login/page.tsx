import Image from "next/image";
import { LoginForm } from "@/components/auth-form";

export const metadata = { title: "Masuk" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const requestedPath = (await searchParams).next;
  const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/cashier";
  return <main className="auth-page"><section className="auth-card card">
    <Image className="auth-logo" src="/logo-eyfa.png" width={184} height={184} alt="EYFA Natural Oil" priority />
    <div className="auth-title"><p className="eyebrow">Kasir & Inventori</p><h1>Selamat datang</h1><p className="subtle">Masuk untuk mencatat penjualan dan mengelola stok EYFA.</p></div>
    <LoginForm configured={configured} nextPath={nextPath} />
  </section></main>;
}
