import Image from "next/image";
import { ForgotForm } from "@/components/auth-form";

export const metadata = { title: "Lupa kata sandi" };
export default function ForgotPasswordPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <main className="auth-page"><section className="auth-card card">
    <Image className="auth-logo" src="/logo-eyfa.png" width={184} height={184} alt="EYFA Natural Oil" />
    <div className="auth-title"><p className="eyebrow">Pemulihan akun</p><h1>Lupa kata sandi?</h1><p className="subtle">Kami akan mengirim tautan pemulihan ke email terdaftar.</p></div>
    <ForgotForm configured={configured} />
  </section></main>;
}
