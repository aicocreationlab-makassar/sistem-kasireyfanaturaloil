import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth-form";

export const metadata={title:"Atur kata sandi baru"};
export default function ResetPasswordPage(){return <main className="auth-page"><section className="auth-card card"><Image className="auth-logo" src="/logo-eyfa.png" width={184} height={184} alt="EYFA Natural Oil"/><div className="auth-title"><p className="eyebrow">Keamanan akun</p><h1>Kata sandi baru</h1><p className="subtle">Gunakan sedikitnya 8 karakter yang mudah Anda ingat.</p></div><ResetPasswordForm/></section></main>}
