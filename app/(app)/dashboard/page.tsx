import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, ShoppingBag } from "lucide-react";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getDashboardData } from "@/lib/data";
import { formatDateTime, number, rupiah } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const data = await getDashboardData();
  const { summary } = data;
  const maxRevenue = Math.max(...data.trend.map((day) => day.revenue), 1);
  return <><RealtimeRefresh tables={["products","sales"]}/><main className="page">
    <div className="page-head"><div><p className="eyebrow">Ringkasan bisnis</p><h1>Dashboard</h1><p className="subtle">Angka hari ini mengikuti waktu Makassar.</p></div><Link href="/cashier" prefetch className="btn btn-primary">Buka Kasir</Link></div>
    <div className="grid metrics">
      <article className="card metric primary"><div className="label">Omzet Hari Ini</div><div className="value">{rupiah(summary.revenue)}</div><div className="tiny">Penjualan selesai</div></article>
      <article className="card metric"><div className="label">Estimasi Laba Kotor</div><div className="value">{summary.profit === null ? "—" : rupiah(summary.profit)}</div><div className="tiny">{summary.profit === null ? "HPP belum lengkap" : "Setelah total HPP"}</div></article>
      <article className="card metric"><div className="label">Transaksi Hari Ini</div><div className="value">{number(summary.transactions)}</div><div className="tiny">Transaksi selesai</div></article>
      <article className="card metric"><div className="label">Total Stok Produk</div><div className="value">{number(summary.stock)}</div><div className="tiny">Produk aktif</div></article>
    </div>
    {summary.profit === null && <div className="error section" style={{borderColor:"#ead7ac",background:"#fffaf0",color:"var(--warning)"}}>Lengkapi HPP agar estimasi laba dapat dihitung akurat.</div>}
    <div className="split section">
      <section className="card card-pad"><div className="section-head"><div><p className="eyebrow">7 hari terakhir</p><h2>Tren Penjualan</h2></div><BarChart3 color="var(--brand)"/></div><div className="chart" aria-label="Grafik omzet tujuh hari">
        {data.trend.map((day)=><div className="bar-wrap" key={day.date} title={`${day.date}: ${rupiah(day.revenue)}`}><div className="bar" style={{height:`${Math.max(day.revenue/maxRevenue*100,2)}%`}}/><span className="bar-label">{day.label}</span></div>)}
      </div></section>
      <section className="card card-pad"><p className="eyebrow">Produk terlaris</p><h2>{data.best?.name ?? "Belum ada penjualan"}</h2>{data.best && <><div style={{fontSize:34,fontWeight:850,color:"var(--brand)"}}>{number(data.best.quantity)}</div><p className="subtle">produk terjual dalam 7 hari</p></>} {!data.best && <div className="empty"><ShoppingBag/><p>Data akan tampil setelah transaksi pertama.</p></div>}</section>
    </div>
    <div className="split section">
      <section><div className="section-head"><h2>Stok Menipis</h2><Link href="/inventory" prefetch className="btn btn-ghost">Lihat stok <ArrowRight size={17}/></Link></div><div className="card list">
        {data.lowStock.slice(0,6).map((product)=><Link href={`/products/${product.id}`} prefetch className="list-item" key={product.id}><div className="list-main"><div className="list-title">{product.name}</div><div className="list-meta">Batas minimum {product.low_stock_threshold}</div></div><div className="list-value" style={{color:product.stock_quantity===0?"var(--danger)":"var(--warning)"}}>{product.stock_quantity} produk</div></Link>)}
        {!data.lowStock.length && <div className="empty"><AlertTriangle/><p>Semua stok dalam kondisi aman.</p></div>}
      </div></section>
      <section><div className="section-head"><h2>Transaksi Terbaru</h2><Link href="/sales" prefetch className="btn btn-ghost">Semua <ArrowRight size={17}/></Link></div><div className="card list">
        {data.recent.map((sale)=><Link href={`/sales/${sale.id}`} prefetch className="list-item" key={sale.id}><div className="list-main"><div className="list-title">{sale.transaction_code}</div><div className="list-meta">{formatDateTime(sale.created_at)} · {sale.profiles?.full_name}</div></div><div className="list-value">{rupiah(sale.total_amount)}</div></Link>)}
        {!data.recent.length && <div className="empty"><ShoppingBag/><p>Belum ada transaksi.</p></div>}
      </div></section>
    </div>
  </main></>;
}
