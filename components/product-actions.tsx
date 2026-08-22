"use client";

import { useState } from "react";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

export function ProductArchiveAction({ id, active }: { id: string; active: boolean }) {
  const router = useRouter(); const { toast } = useToast(); const [pending,setPending]=useState(false); const [error,setError]=useState("");
  async function run() {
    if (active && !confirm("Arsipkan produk ini? Riwayat transaksi tetap tersimpan.")) return;
    if (pending) return;
    setPending(true); setError("");
    try {
      const { error: requestError } = await createClient().rpc(active ? "archive_product" : "restore_product", { p_product_id:id });
      if (requestError) throw requestError;
      toast({ message: active ? "Produk berhasil diarsipkan." : "Produk berhasil diaktifkan kembali.", tone: "success" });
      router.push("/products");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Tindakan produk gagal. Silakan coba lagi.";
      setError(message);
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }
  return <div style={{minWidth:0}}>{error&&<div className="error" role="alert" style={{marginBottom:10,overflowWrap:"anywhere"}}>{error}</div>}<button type="button" className={active?"btn btn-danger":"btn btn-secondary"} onClick={run} disabled={pending} style={{maxWidth:"100%"}}>{active?<ArchiveX size={18}/>:<ArchiveRestore size={18}/>} {pending?"Memproses...":active?"Arsipkan Produk":"Aktifkan Kembali"}</button></div>;
}
