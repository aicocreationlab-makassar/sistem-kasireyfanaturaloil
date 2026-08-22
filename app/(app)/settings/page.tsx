import Link from "next/link";
import { BarChart3, ChevronRight, History, LockKeyhole, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { getSessionContext } from "@/lib/data";

export const metadata={title:"Menu & Profil"};
export default async function SettingsPage(){const {user,profile}=await getSessionContext();return <main className="page"><div className="page-head"><div><p className="eyebrow">Akun</p><h1>Menu & Profil</h1><p className="subtle">Akses dan pintasan operasional.</p></div></div>
  <section className="card card-pad"><div style={{display:"flex",alignItems:"center",gap:14}}><div className="avatar" style={{width:52,height:52,fontSize:16}}><UserRound/></div><div><h2 style={{marginBottom:3}}>{profile.full_name}</h2><p className="subtle" style={{margin:0}}>{user.email} · <span style={{textTransform:"capitalize"}}>{profile.role}</span></p></div></div></section>
  <section className="section"><h2>Pintasan</h2><div className="card list"><Link href="/dashboard" className="list-item"><div style={{display:"flex",gap:12,alignItems:"center"}}><BarChart3 color="var(--brand)"/><div><div className="list-title">Dashboard</div><div className="list-meta">Ringkasan omzet, tren, dan stok</div></div></div><ChevronRight/></Link><Link href="/sales" className="list-item"><div style={{display:"flex",gap:12,alignItems:"center"}}><History color="var(--brand)"/><div><div className="list-title">Riwayat Penjualan</div><div className="list-meta">Transaksi dan detail penjualan</div></div></div><ChevronRight/></Link></div></section>
  <section className="section card card-pad"><div style={{display:"flex",gap:12}}><LockKeyhole color="var(--brand)"/><div><h3>Keamanan akses</h3><p className="subtle">Peran <strong>{profile.role}</strong> diterapkan oleh kebijakan database. Mutasi stok dan transaksi hanya dapat dilakukan melalui operasi tervalidasi.</p></div></div></section>
  <div className="section"><LogoutButton/></div>
  <p className="tiny" style={{textAlign:"center",marginTop:20}}>EYFA POS · Waktu bisnis Asia/Makassar</p>
  </main>}
