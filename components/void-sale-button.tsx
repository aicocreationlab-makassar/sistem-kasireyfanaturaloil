"use client";

import { FormEvent, useState } from "react";
import { Ban, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function VoidSaleButton({ saleId }: { saleId: string }) {
  const router=useRouter();const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setPending(true);setError("");const form=new FormData(e.currentTarget);const {error}=await createClient().rpc("void_sale",{p_sale_id:saleId,p_reason:String(form.get("reason"))});if(error){setError(error.message);setPending(false);return;}setOpen(false);router.refresh();}
  return <>{<button className="btn btn-danger" onClick={()=>setOpen(true)}><Ban size={18}/> Batalkan Transaksi</button>}{open&&<div className="sheet-backdrop"><form className="sheet form-grid" onSubmit={submit}><div className="sheet-handle"/><div className="sheet-head"><div><p className="eyebrow">Koreksi transaksi</p><h2>Batalkan transaksi?</h2></div><button type="button" className="btn icon-btn" onClick={()=>setOpen(false)}><X/></button></div><p className="subtle">Stok seluruh produk akan dikembalikan tepat satu kali. Rekaman transaksi tetap disimpan untuk audit.</p>{error&&<div className="error">{error}</div>}<div className="field"><label htmlFor="reason">Alasan pembatalan</label><textarea id="reason" name="reason" className="textarea" required minLength={3} autoFocus/></div><button className="btn btn-danger btn-wide btn-lg" disabled={pending}>{pending?"Membatalkan...":"Konfirmasi Pembatalan"}</button></form></div>}</>;
}
