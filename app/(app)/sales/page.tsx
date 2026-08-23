import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { getSessionContext } from "@/lib/data";
import { formatDateTime, rupiah } from "@/lib/format";
import type { Sale } from "@/lib/types";

export const metadata={title:"Riwayat Penjualan"};
type SaleListItem = Pick<Sale, "id" | "transaction_code" | "status" | "created_at" | "payment_method" | "total_amount"> & {
  profiles?: { full_name: string } | null;
  sale_items: Array<{ quantity: number }>;
};
export default async function SalesPage(){const {supabase,profile}=await getSessionContext();const {data,error}=await supabase.from("sales").select("id,transaction_code,status,created_at,payment_method,total_amount,profiles!sales_cashier_id_fkey(full_name),sale_items(quantity)").order("created_at",{ascending:false}).limit(50);if(error)throw error;const sales=data as unknown as SaleListItem[];return <main className="page"><div className="page-head"><div><p className="eyebrow">{profile.role==="cashier"?"Transaksi saya":"Semua transaksi"}</p><h1>Riwayat Penjualan</h1><p className="subtle">50 transaksi terbaru · data tidak dapat dihapus.</p></div></div><div className="card list">{sales.map(sale=><Link href={`/sales/${sale.id}`} prefetch className="list-item" key={sale.id}><div className="list-main"><div style={{display:"flex",gap:7,alignItems:"center"}}><span className="list-title">{sale.transaction_code}</span>{sale.status==="voided"&&<span className="badge danger">Dibatalkan</span>}</div><div className="list-meta">{formatDateTime(sale.created_at)} · {sale.profiles?.full_name||"-"}</div><div className="tiny">{sale.sale_items.reduce((sum,item)=>sum+item.quantity,0)} item · {sale.payment_method||"-"}</div></div><div className="list-value" style={{textDecoration:sale.status==="voided"?"line-through":"none"}}>{rupiah(sale.total_amount)}</div></Link>)}{!sales.length&&<div className="empty"><ReceiptText/><p>Belum ada transaksi.</p></div>}</div></main>}
