"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, QrCode, ScanLine, Upload, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { RupiahInput } from "@/components/rupiah-input";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

const builtInImages = [
  { value: "/products/minyak-kemirimurni.png", label: "Kemiri Murni" },
  { value: "/products/minyak-kemiribakar.png", label: "Kemiri Bakar" },
  { value: "/products/minyak-kemirihitam.png", label: "Kemiri Hitam" },
];

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return "Barcode atau SKU ini sudah digunakan oleh produk lain.";
  }
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "Terjadi kendala. Silakan coba lagi.";
  return message.toLowerCase().includes("duplicate") ? "Barcode atau SKU ini sudah digunakan oleh produk lain." : message;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character);
}

export function ProductForm({ product, prefillBarcode = "" }: { product?: Product; prefillBarcode?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcode, setBarcode] = useState(product?.barcode_value ?? prefillBarcode);
  const [barcodeType, setBarcodeType] = useState<NonNullable<Product["barcode_type"]>>(
    product?.barcode_type ?? (prefillBarcode ? "custom" : "qr"),
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? builtInImages[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [qrData, setQrData] = useState("");
  const [generatingQr, setGeneratingQr] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [impactWarningOpen, setImpactWarningOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const impactConfirmed = useRef(false);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  useEffect(() => {
    if (!impactWarningOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [impactWarningOpen]);

  function selectFile(nextFile: File | null) {
    if (nextFile && nextFile.size > 5 * 1024 * 1024) {
      const message = "Ukuran gambar maksimal 5 MB.";
      setError(message);
      toast({ message, tone: "error" });
      return;
    }
    setFile(nextFile);
    setFilePreview(nextFile ? URL.createObjectURL(nextFile) : "");
    setError("");
  }

  const generateQr = useCallback(async () => {
    setGeneratingQr(true);
    try {
      const value = barcode || `EYFA-${sku || crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      setBarcode(value);
      setBarcodeType("qr");
      const QRCode = await import("qrcode");
      setQrData(await QRCode.toDataURL(value, { width: 640, margin: 2, errorCorrectionLevel: "M" }));
      toast({ message: "QR produk berhasil dibuat.", tone: "success" });
    } catch (caught) {
      toast({ message: errorMessage(caught), tone: "error" });
    } finally {
      setGeneratingQr(false);
    }
  }, [barcode, sku, toast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const hppText = String(form.get("hpp") ?? "").trim();
    const nextHpp = hppText ? Number(hppText) : null;
    const changesFinancialCalculation = product && (
      Number(form.get("selling_price")) !== Number(product.selling_price)
      || nextHpp !== (product.hpp === null ? null : Number(product.hpp))
    );
    if (changesFinancialCalculation && !impactConfirmed.current) {
      setImpactWarningOpen(true);
      return;
    }

    impactConfirmed.current = false;
    setPending(true);
    setError("");
    try {
      let finalImage = imageUrl;
      const supabase = createClient();
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from("product-images").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });
        if (upload.error) throw new Error(`Gagal mengunggah gambar: ${upload.error.message}`);
        finalImage = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      const shared = {
        p_name: String(form.get("name")).trim(),
        p_variant: String(form.get("variant")),
        p_size_ml: Number(form.get("size_ml")),
        p_sku: String(form.get("sku")).trim(),
        p_selling_price: Number(form.get("selling_price")),
        p_hpp: nextHpp,
        p_low_stock_threshold: Number(form.get("low_stock_threshold")),
        p_image_url: finalImage,
        p_barcode_value: barcode.trim() || null,
        p_barcode_type: barcode.trim() ? barcodeType : null,
      };
      const result = product
        ? await supabase.rpc("update_product", { p_id: product.id, ...shared })
        : await supabase.rpc("create_product", { ...shared, p_initial_stock: Number(form.get("initial_stock")) });
      if (result.error) throw result.error;

      toast({ message: product ? "Perubahan produk berhasil disimpan." : "Produk baru berhasil disimpan.", tone: "success" });
      router.replace("/products");
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  function confirmFinancialEdit() {
    impactConfirmed.current = true;
    setImpactWarningOpen(false);
    window.requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const detected = useCallback((value: string, format: string) => {
    setBarcode(value);
    setBarcodeType(format.includes("qr") ? "qr" : format.includes("ean13") ? "ean13" : format.includes("ean8") ? "ean8" : format.includes("128") ? "code128" : "custom");
    setScannerOpen(false);
    toast({ message: "Kode produk berhasil dipindai.", tone: "success" });
  }, [toast]);

  async function copyBarcode() {
    try {
      await navigator.clipboard.writeText(barcode);
      toast({ message: "Kode berhasil disalin.", tone: "success" });
    } catch {
      toast({ message: "Kode tidak dapat disalin oleh browser.", tone: "error" });
    }
  }

  function printQrLabel() {
    const popup = window.open("", "_blank", "width=420,height=520");
    if (!popup) {
      toast({ message: "Izinkan pop-up browser untuk mencetak label.", tone: "error" });
      return;
    }
    popup.document.write(`<title>Label ${escapeHtml(sku)}</title><body style="font-family:sans-serif;text-align:center;padding:24px"><img src="${qrData}" width="300" height="300" alt="QR"><h2>${escapeHtml(sku)}</h2><p style="overflow-wrap:anywhere">${escapeHtml(barcode)}</p><script>onload=()=>print()<\/script></body>`);
    popup.document.close();
  }

  return (
    <>
      <form ref={formRef} className="card card-pad form-grid" onSubmit={submit} style={{ minWidth: 0 }}>
        {error && <div className="error" role="alert" style={{ overflowWrap: "anywhere" }}>{error}</div>}
        <div className="form-grid two">
          <div className="field"><label htmlFor="name">Nama Produk</label><input id="name" name="name" className="input" required defaultValue={product?.name} placeholder="Minyak Kemiri Murni 60 ml" /></div>
          <div className="field"><label htmlFor="variant">Varian</label><select id="variant" name="variant" className="select" defaultValue={product?.variant ?? "Murni"}><option>Murni</option><option>Bakar</option><option>Hitam</option></select></div>
          <div className="field"><label htmlFor="size_ml">Ukuran (ml)</label><input id="size_ml" name="size_ml" className="input" type="number" inputMode="numeric" min="1" step="1" required defaultValue={product?.size_ml ?? 60} /></div>
          <div className="field"><label htmlFor="sku">SKU</label><input id="sku" name="sku" className="input" required value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} placeholder="EYFA-MURNI-60" /></div>
          <div className="field"><label htmlFor="selling_price">Harga Jual</label><RupiahInput id="selling_price" name="selling_price" required defaultValue={product?.selling_price ?? 55000} /></div>
          <div className="field"><label htmlFor="hpp">HPP / Unit <span className="tiny">(opsional)</span></label><RupiahInput id="hpp" name="hpp" defaultValue={product?.hpp} placeholder="Belum diatur" /><span className="help">Kosongkan jika HPP belum diketahui.</span></div>
          {!product && <div className="field"><label htmlFor="initial_stock">Stok Awal</label><input id="initial_stock" name="initial_stock" className="input" type="number" inputMode="numeric" min="0" step="1" required defaultValue="0" /></div>}
          <div className="field"><label htmlFor="low_stock_threshold">Batas Stok Menipis</label><input id="low_stock_threshold" name="low_stock_threshold" className="input" type="number" inputMode="numeric" min="0" step="1" required defaultValue={product?.low_stock_threshold ?? 5} /></div>
        </div>

        <div className="divider" />
        <div style={{ minWidth: 0 }}>
          <h2>Gambar Produk</h2>
          <div className="form-grid two">
            <div className="field"><label>Gunakan aset EYFA</label><select className="select" value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); selectFile(null); }}>{builtInImages.map((image) => <option value={image.value} key={image.value}>{image.label}</option>)}</select></div>
            <div className="field" style={{ minWidth: 0 }}><label htmlFor="image">Atau unggah gambar</label><label className="btn btn-secondary" htmlFor="image" style={{ maxWidth: "100%", minWidth: 0 }}><Upload size={18} style={{ flex: "0 0 auto" }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name ?? "Pilih gambar"}</span></label><input id="image" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></div>
          </div>
          <div style={{ position: "relative", width: 130, maxWidth: "100%", height: 110, marginTop: 12, background: "var(--cream)", borderRadius: 12, overflow: "hidden" }}><Image src={filePreview || imageUrl} alt="Pratinjau produk" fill style={{ objectFit: "contain" }} sizes="130px" /></div>
        </div>

        <div className="divider" />
        <div style={{ minWidth: 0 }}>
          <h2>Barcode / QR</h2>
          <div className="form-grid two">
            <div className="field"><label htmlFor="barcode">Nilai kode</label><input id="barcode" className="input" value={barcode} onChange={(event) => { setBarcode(event.target.value); setQrData(""); }} placeholder="Opsional" /></div>
            <div className="field"><label htmlFor="barcode_type">Jenis</label><select id="barcode_type" className="select" value={barcodeType} onChange={(event) => setBarcodeType(event.target.value as NonNullable<Product["barcode_type"]>)}><option value="qr">QR</option><option value="ean13">EAN-13</option><option value="ean8">EAN-8</option><option value="code128">Code 128</option><option value="custom">Custom</option></select></div>
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: "1 1 160px" }} onClick={() => setScannerOpen(true)}><ScanLine size={18} /> Scan Barcode</button>
            <button type="button" className="btn btn-secondary" style={{ flex: "1 1 160px" }} onClick={generateQr} disabled={generatingQr}><QrCode size={18} /> {generatingQr ? "Membuat..." : "Generate QR"}</button>
          </div>
          {qrData && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
              <Image src={qrData} alt={`QR ${barcode}`} width={150} height={150} style={{ maxWidth: "100%", height: "auto" }} />
              <div className="form-grid" style={{ flex: "1 1 170px", minWidth: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={copyBarcode}>Salin Kode</button>
                <a className="btn btn-secondary" href={qrData} download={`${sku || "eyfa-product"}-qr.png`}><Download size={18} /> Unduh PNG</a>
                <button type="button" className="btn btn-secondary" onClick={printQrLabel}><Printer size={18} /> Cetak Label</button>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary btn-lg" style={{ flex: "1 1 180px" }} disabled={pending}>{pending ? "Menyimpan..." : product ? "Simpan Perubahan" : "Simpan Produk"}</button>
          <button type="button" className="btn btn-secondary btn-lg" style={{ flex: "1 1 120px" }} onClick={() => router.back()} disabled={pending}><X size={18} /> Batal</button>
        </div>
      </form>
      {scannerOpen && <BarcodeScanner onDetected={detected} onClose={() => setScannerOpen(false)} />}
      {impactWarningOpen && (
        <div className="action-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setImpactWarningOpen(false)}>
          <section className="action-modal" role="alertdialog" aria-modal="true" aria-labelledby="edit-impact-title" aria-describedby="edit-impact-description">
            <div className="sheet-head">
              <div><p className="eyebrow">Dampak perhitungan</p><h2 id="edit-impact-title">Simpan perubahan harga/HPP?</h2></div>
              <button type="button" className="btn icon-btn" onClick={() => setImpactWarningOpen(false)} aria-label="Tutup"><X /></button>
            </div>
            <div id="edit-impact-description" className="action-info">
              Harga jual atau HPP berubah. Transaksi dan laporan lama tetap memakai nilai snapshot sebelumnya. Transaksi berikutnya akan memakai nilai baru untuk omzet, HPP, dan laba.
            </div>
            <div className="action-modal-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setImpactWarningOpen(false)}>Periksa Lagi</button>
              <button type="button" className="btn btn-primary" onClick={confirmFinancialEdit}>Tetap Simpan</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
