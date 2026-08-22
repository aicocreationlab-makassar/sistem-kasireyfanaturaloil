"use client";

import { useState } from "react";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProductArchiveAction({ id, active }: { id: string; active: boolean }) {
  const router = useRouter(); const [pending,setPending]=useState(false); const [error,setError]=useState("");
  async function run() {
    if (active && !confirm("Arsipkan produk ini? Riwayat transaksi tetap tersimpan.")) return;
    setPending(true); setError(""); const { error } = await createClient().rpc(active ? "archive_product" : "restore_product", { p_product_id:id });
    if(error){setError(error.message);setPending(false);return;} router.push("/products");router.refresh();
  }
  return <div>{error&&<div className="error">{error}</div>}<button className={active?"btn btn-danger":"btn btn-secondary"} onClick={run} disabled={pending}>{active?<ArchiveX size={18}/>:<ArchiveRestore size={18}/>} {pending?"Memproses...":active?"Arsipkan Produk":"Aktifkan Kembali"}</button></div>;
}
