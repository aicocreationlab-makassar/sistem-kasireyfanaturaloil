"use client";

import { useState } from "react";
import { ArchiveRestore, ArchiveX, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  async function toggleArchive() {
    if (active && !window.confirm("Arsipkan produk ini? Riwayat transaksi tetap tersimpan.")) return;
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const { error: requestError } = await createClient().rpc(active ? "archive_product" : "restore_product", { p_product_id: id });
      if (requestError) throw requestError;
      toast({ message: active ? "Produk berhasil diarsipkan." : "Produk berhasil diaktifkan kembali.", tone: "success" });
      router.replace("/products");
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
        if (storageError) {
          toast({ message: "Produk terhapus, tetapi file gambar lama belum dapat dibersihkan.", tone: "info", duration: 5000 });
        }
      }

      setDeleteOpen(false);
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

  return (
    <div style={{ minWidth: 0 }}>
      {error && <div className="error" role="alert" style={{ marginBottom: 10, overflowWrap: "anywhere" }}>{error}</div>}
      <div className="form-actions product-actions">
        <button type="button" className={active ? "btn btn-danger" : "btn btn-secondary"} onClick={toggleArchive} disabled={pending}>
          {active ? <ArchiveX size={18} /> : <ArchiveRestore size={18} />}
          {pending ? "Memproses..." : active ? "Arsipkan" : "Aktifkan"}
        </button>
        {canDelete && (
          <button type="button" className="btn btn-danger" onClick={() => { setError(""); setDeleteOpen(true); }} disabled={pending}>
            <Trash2 size={18} /> Hapus
          </button>
        )}
      </div>

      {deleteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !pending && setDeleteOpen(false)}>
          <section className="sheet form-grid" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title" aria-describedby="delete-product-description">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div>
                <p className="eyebrow">Tindakan permanen</p>
                <h2 id="delete-product-title">Hapus produk?</h2>
              </div>
              <button type="button" className="btn icon-btn" onClick={() => setDeleteOpen(false)} disabled={pending} aria-label="Tutup"><X /></button>
            </div>
            <div id="delete-product-description" className="error">
              <strong>{name}</strong> akan dihapus dari katalog bersama stok, barcode, gambar unggahan, dan riwayat pergerakan stoknya. Tindakan ini tidak dapat dibatalkan.
            </div>
            <p className="subtle">Snapshot pada transaksi lama tetap disimpan agar omzet, HPP, laba, dan struk historis tidak rusak.</p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={pending}>Batal</button>
              <button type="button" className="btn btn-danger" onClick={deleteProduct} disabled={pending}><Trash2 size={18} /> {pending ? "Menghapus..." : "Hapus Permanen"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
