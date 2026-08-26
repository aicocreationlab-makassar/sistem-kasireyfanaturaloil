"use client";

import { useState } from "react";
import { ArchiveRestore, ArchiveX, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { ViewportPortal } from "@/components/viewport-portal";
import { createClient } from "@/lib/supabase/client";

type Confirmation = "archive" | "restore" | "delete" | null;

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "Tindakan produk gagal. Silakan coba lagi.";
}

function productImagePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  const encodedPath = imageUrl.slice(markerIndex + marker.length).split("?")[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

export function ProductArchiveAction({ id, name, imageUrl, active, canDelete }: {
  id: string;
  name: string;
  imageUrl: string;
  active: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [error, setError] = useState("");

  function closeConfirmation() {
    if (!pending) setConfirmation(null);
  }

  async function toggleArchive() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const { error: requestError } = await createClient().rpc(active ? "archive_product" : "restore_product", { p_product_id: id });
      if (requestError) throw requestError;
      setConfirmation(null);
      toast({ message: active ? "Produk berhasil diarsipkan." : "Produk berhasil diaktifkan kembali.", tone: "success" });
      router.replace("/products");
      router.refresh();
    } catch (caught) {
      const message = messageFrom(caught);
      setError(message);
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function deleteProduct() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: deletedImageUrl, error: requestError } = await supabase.rpc("delete_product", { p_product_id: id });
      if (requestError) throw requestError;

      const imagePath = productImagePath(typeof deletedImageUrl === "string" ? deletedImageUrl : imageUrl);
      if (imagePath) {
        const { error: storageError } = await supabase.storage.from("product-images").remove([imagePath]);
        if (storageError) toast({ message: "Produk terhapus, tetapi file gambar lama belum dapat dibersihkan.", tone: "info", duration: 5000 });
      }

      setConfirmation(null);
      toast({ message: `Produk ${name} berhasil dihapus permanen.`, tone: "success" });
      router.replace("/products");
      router.refresh();
    } catch (caught) {
      const message = messageFrom(caught);
      setError(message);
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  const deleting = confirmation === "delete";
  const archiving = confirmation === "archive";

  return (
    <div style={{ minWidth: 0 }}>
      {error && <div className="error" role="alert" style={{ marginBottom: 10, overflowWrap: "anywhere" }}>{error}</div>}
      <div className="form-actions product-actions">
        <button type="button" className={active ? "btn btn-danger" : "btn btn-secondary"} onClick={() => { setError(""); setConfirmation(active ? "archive" : "restore"); }} disabled={pending}>
          {active ? <ArchiveX size={18} /> : <ArchiveRestore size={18} />}
          {active ? "Arsipkan" : "Aktifkan"}
        </button>
        {canDelete && <button type="button" className="btn btn-danger" onClick={() => { setError(""); setConfirmation("delete"); }} disabled={pending}><Trash2 size={18} /> Hapus</button>}
      </div>

      {confirmation && <ViewportPortal>
        <div className="action-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeConfirmation()}>
          <section className="action-modal" role="alertdialog" aria-modal="true" aria-labelledby="product-action-title" aria-describedby="product-action-description">
            <div className="sheet-head">
              <div>
                <p className="eyebrow">Konfirmasi produk</p>
                <h2 id="product-action-title">{deleting ? "Hapus produk permanen?" : archiving ? "Arsipkan produk?" : "Aktifkan kembali produk?"}</h2>
              </div>
              <button type="button" className="btn icon-btn" onClick={closeConfirmation} disabled={pending} aria-label="Tutup"><X /></button>
            </div>

            <div id="product-action-description" className={deleting ? "error" : "action-info"}>
              {deleting
                ? <><strong>{name}</strong> akan dihapus bersama stok, barcode, gambar unggahan, dan ledger stok. Tindakan ini tidak dapat dibatalkan.</>
                : archiving
                  ? <><strong>{name}</strong> tidak akan tampil di kasir, tetapi data dan riwayat transaksi tetap aman.</>
                  : <><strong>{name}</strong> akan kembali tampil dan dapat dijual melalui halaman kasir.</>}
            </div>
            {deleting && <p className="subtle">Snapshot transaksi lama tetap disimpan agar laporan historis tidak berubah.</p>}

            <div className="action-modal-buttons">
              <button type="button" className="btn btn-secondary" onClick={closeConfirmation} disabled={pending}>Batal</button>
              <button type="button" className={deleting || archiving ? "btn btn-danger" : "btn btn-primary"} onClick={deleting ? deleteProduct : toggleArchive} disabled={pending}>
                {deleting ? <Trash2 size={18} /> : archiving ? <ArchiveX size={18} /> : <ArchiveRestore size={18} />}
                {pending ? "Memproses..." : deleting ? "Hapus Permanen" : archiving ? "Arsipkan Produk" : "Aktifkan Produk"}
              </button>
            </div>
          </section>
        </div>
      </ViewportPortal>}
    </div>
  );
}
