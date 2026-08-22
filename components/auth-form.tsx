"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LoaderCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message === "Invalid login credentials" ? "Email atau kata sandi tidak sesuai." : authError.message); setPending(false); return; }
    window.location.assign("/cashier");
  }
  if (!configured) return <div className="error">Supabase belum dikonfigurasi. Isi variabel pada <strong>.env.local</strong>, jalankan migration dan seed, lalu muat ulang halaman.</div>;
  return <form className="auth-form form-grid" onSubmit={submit}>
    {error && <div className="error" role="alert">{error}</div>}
    <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@eyfa.id" /></div>
    <div className="field"><label htmlFor="password">Kata sandi</label><input id="password" className="input" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
    <button className="btn btn-primary btn-wide btn-lg" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={19} /> : <LogIn size={19} />} {pending ? "Memeriksa..." : "Masuk"}</button>
    <Link href="/forgot-password" className="btn btn-ghost">Lupa kata sandi?</Link>
  </form>;
}

export function ForgotForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setMessage(error ? error.message : "Tautan pemulihan telah dikirim. Periksa inbox email Anda."); setPending(false);
  }
  if (!configured) return <div className="error">Supabase belum dikonfigurasi.</div>;
  return <form className="auth-form form-grid" onSubmit={submit}>
    {message && <div className={message.startsWith("Tautan") ? "success-box" : "error"}>{message}</div>}
    <div className="field"><label htmlFor="email">Email akun</label><input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
    <button className="btn btn-primary btn-wide" disabled={pending}>{pending ? "Mengirim..." : "Kirim tautan pemulihan"}</button>
    <Link href="/login" className="btn btn-ghost">Kembali ke login</Link>
  </form>;
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setMessage("Konfirmasi kata sandi tidak sama."); return; }
    setPending(true); const { error } = await createClient().auth.updateUser({ password });
    if (error) { setMessage(error.message); setPending(false); return; }
    window.location.assign("/cashier");
  }
  return <form className="auth-form form-grid" onSubmit={submit}>
    {message && <div className="error">{message}</div>}
    <div className="field"><label htmlFor="password">Kata sandi baru</label><input id="password" className="input" type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)}/></div>
    <div className="field"><label htmlFor="confirm">Ulangi kata sandi</label><input id="confirm" className="input" type="password" required minLength={8} value={confirm} onChange={(e)=>setConfirm(e.target.value)}/></div>
    <button className="btn btn-primary btn-wide" disabled={pending}>{pending?"Menyimpan...":"Simpan kata sandi baru"}</button>
  </form>;
}
