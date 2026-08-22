"use client";

import { FormEvent, useState } from "react";
import { Ban, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

export function VoidSaleButton({ saleId }: { saleId: string }) {
  const router=useRouter();const { toast }=useToast();const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(pending)return;setPending(true);setError("");const form=new FormData(e.currentTarget);
    try {
      const {error:requestError}=await createClient().rpc("void_sale",{p_sale_id:saleId,p_reason:String(form.get("reason")).trim()});
      if(requestError)throw requestError;
      toast({message:"Transaksi berhasil dibatalkan dan stok telah dikembalikan.",tone:"success"});
      setOpen(false);router.refresh();
    } catch(caught) {
      const message=caught instanceof Error?caught.message:"Pembatalan transaksi gagal. Silakan coba lagi.";
      setError(message);toast({message,tone:"error"});
    } finally {setPending(false);}
  }
  function close(){if(pending)return;setError("");setOpen(false);}
  return <><button type="button" className="btn btn-danger" onClick={()=>{setError("");setOpen(true);}}><Ban size={18}/> Batalkan Transaksi</button>{open&&<div className="sheet-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&close()}><form className="sheet form-grid" onSubmit={submit}><div className="sheet-handle"/><div className="sheet-head"><div style={{minWidth:0}}><p className="eyebrow">Koreksi transaksi</p><h2>Batalkan transaksi?</h2></div><button type="button" className="btn icon-btn" onClick={close} disabled={pending} aria-label="Tutup"><X/></button></div><p className="subtle">Stok seluruh produk akan dikembalikan tepat satu kali. Rekaman transaksi tetap disimpan untuk audit.</p>{error&&<div className="error" role="alert" style={{overflowWrap:"anywhere"}}>{error}</div>}<div className="field"><label htmlFor="reason">Alasan pembatalan</label><textarea id="reason" name="reason" className="textarea" required minLength={3} autoFocus/></div><button className="btn btn-danger btn-wide btn-lg" disabled={pending}>{pending?"Membatalkan...":"Konfirmasi Pembatalan"}</button></form></div>}</>;
}
