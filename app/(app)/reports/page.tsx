import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { CsvDownload } from "@/components/csv-download";
import { requireAdmin } from "@/lib/data";
import { localDateISO, makassarRange, number, rupiah } from "@/lib/format";
import type { ReportRow } from "@/lib/types";

export const metadata={title:"Laporan"};
function shiftDate(days:number){return localDateISO(new Date(Date.now()+days*86400000))}
export default async function ReportsPage({searchParams}:{searchParams:Promise<{from?:string;to?:string;preset?:string}>}){
  const {supabase}=await requireAdmin();const params=await searchParams;const today=localDateISO();let from=params.from||today;let to=params.to||today;const preset=params.preset||"today";
  if(preset==="yesterday"){from=shiftDate(-1);to=from}else if(preset==="7days"){from=shiftDate(-6);to=today}else if(preset==="month"){from=`${today.slice(0,7)}-01`;to=today}
  if(from>to){const swap=from;from=to;to=swap}const range=makassarRange(from,to);
  const {data,error}=await supabase.from("sale_items").select("*,sales!inner(transaction_code,created_at,payment_method,status,profiles!sales_cashier_id_fkey(full_name))").eq("sales.status","completed").gte("sales.created_at",range.start).lte("sales.created_at",range.end).order("created_at",{ascending:false,referencedTable:"sales"});if(error)throw error;
  const rows=data as unknown as ReportRow[];const revenue=rows.reduce((s,r)=>s+Number(r.line_revenue),0);const quantity=rows.reduce((s,r)=>s+r.quantity,0);const hppComplete=rows.every(r=>r.line_cogs!==null);const cogs=hppComplete?rows.reduce((s,r)=>s+Number(r.line_cogs),0):null;const profit=cogs===null?null:revenue-cogs;const transactions=new Set(rows.map(r=>r.sale_id)).size;const average=transactions?revenue/transactions:0;
  const ranked=new Map<string,{name:string;quantity:number}>();rows.forEach(row=>{const old=ranked.get(row.product_id)||{name:row.product_name_snapshot,quantity:0};old.quantity+=row.quantity;ranked.set(row.product_id,old)});const best=[...ranked.values()].sort((a,b)=>b.quantity-a.quantity)[0];
  const links=[{key:"today",label:"Hari Ini"},{key:"yesterday",label:"Kemarin"},{key:"7days",label:"7 Hari"},{key:"month",label:"Bulan Ini"}];
  return <main className="page"><div className="page-head"><div><p className="eyebrow">Analisis penjualan</p><h1>Laporan</h1><p className="subtle">Berdasarkan snapshot harga dan HPP saat transaksi.</p></div><CsvDownload rows={rows} from={from} to={to}/></div>
    <div className="filters">{links.map(link=><Link key={link.key} href={`/reports?preset=${link.key}`} className={`filter ${preset===link.key?"active":""}`}>{link.label}</Link>)}</div>
    <form className="card card-pad form-grid two section" action="/reports"><input type="hidden" name="preset" value="custom"/><div className="field"><label htmlFor="from">Dari tanggal</label><input id="from" name="from" className="input" type="date" defaultValue={from} required/></div><div className="field"><label htmlFor="to">Sampai tanggal</label><input id="to" name="to" className="input" type="date" defaultValue={to} required/></div><button className="btn btn-secondary">Terapkan Rentang</button></form>
    <p className="subtle section">Periode <strong>{from}</strong> sampai <strong>{to}</strong> · zona waktu Asia/Makassar</p>
    <div className="grid metrics">
      <article className="card metric primary"><div className="label">Omzet</div><div className="value">{rupiah(revenue)}</div><div className="tiny">{transactions} transaksi</div></article>
      <article className="card metric"><div className="label">Produk Terjual</div><div className="value">{number(quantity)}</div><div className="tiny">unit</div></article>
      <article className="card metric"><div className="label">Total HPP</div><div className="value">{cogs===null?"—":rupiah(cogs)}</div><div className="tiny">{cogs===null?"HPP belum lengkap":"Snapshot transaksi"}</div></article>
      <article className="card metric"><div className="label">Estimasi Laba Kotor</div><div className="value">{profit===null?"—":rupiah(profit)}</div><div className="tiny">{profit===null?"Belum dapat dihitung":`${revenue?((profit/revenue)*100).toFixed(1):0}% margin`}</div></article>
    </div>
    <div className="split section"><section className="card card-pad"><p className="eyebrow">Rata-rata transaksi</p><div style={{fontSize:28,fontWeight:850}}>{rupiah(average)}</div></section><section className="card card-pad"><p className="eyebrow">Produk terlaris</p><h2>{best?.name||"Belum ada data"}</h2>{best&&<p className="subtle">{number(best.quantity)} unit terjual</p>}</section></div>
    <section className="section"><h2>Rincian Produk Terjual</h2><div className="card list">{rows.slice(0,100).map(row=><div className="list-item" key={row.id}><div className="list-main"><div className="list-title">{row.product_name_snapshot}</div><div className="list-meta">{row.sales.transaction_code} · {row.quantity} × {rupiah(row.unit_selling_price)}</div><div className="tiny">{new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Makassar",dateStyle:"medium",timeStyle:"short"}).format(new Date(row.sales.created_at))}</div></div><div className="list-value">{rupiah(row.line_revenue)}<div className="tiny">{row.line_gross_profit===null?"HPP belum diatur":`Laba ${rupiah(row.line_gross_profit)}`}</div></div></div>)}{!rows.length&&<div className="empty"><BarChart3/><p>Tidak ada penjualan pada periode ini.</p></div>}</div>{rows.length>100&&<p className="tiny" style={{marginTop:8}}>Menampilkan 100 baris pertama. CSV memuat seluruh {rows.length} baris.</p>}</section>
  </main>
}
