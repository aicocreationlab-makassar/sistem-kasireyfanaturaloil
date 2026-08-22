"use client";

import Image from "next/image";
import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, QrCode, ScanLine, Upload, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

const builtInImages = [
  { value: "/products/minyak-kemirimurni.png", label: "Kemiri Murni" },
  { value: "/products/minyak-kemiribakar.png", label: "Kemiri Bakar" },
  { value: "/products/minyak-kemirihitam.png", label: "Kemiri Hitam" },
];

export function ProductForm({ product, prefillBarcode = "" }: { product?: Product; prefillBarcode?: string }) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcode, setBarcode] = useState(product?.barcode_value ?? prefillBarcode);
  const [barcodeType, setBarcodeType] = useState(product?.barcode_type ?? (prefillBarcode ? "custom" : "qr"));
  const [sku, setSku] = useState(product?.sku ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? builtInImages[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [qrData, setQrData] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const generateQr = useCallback(async () => {
    const value = barcode || `EYFA-${sku || crypto.randomUUID().slice(0,8).toUpperCase()}`;
    setBarcode(value); setBarcodeType("qr");
    const QRCode = await import("qrcode"); setQrData(await QRCode.toDataURL(value, { width: 640, margin: 2, errorCorrectionLevel: "M" }));
  }, [barcode, sku]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    let finalImage = imageUrl;
    const supabase = createClient();
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const upload = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upload.error) { setError(`Gagal mengunggah gambar: ${upload.error.message}`); setPending(false); return; }
      finalImage = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const hppText = String(form.get("hpp") ?? "").trim();
    const shared = {
      p_name: String(form.get("name")), p_variant: String(form.get("variant")), p_size_ml: Number(form.get("size_ml")),
      p_sku: String(form.get("sku")), p_selling_price: Number(form.get("selling_price")), p_hpp: hppText ? Number(hppText) : null,
      p_low_stock_threshold: Number(form.get("low_stock_threshold")), p_image_url: finalImage,
      p_barcode_value: barcode || null, p_barcode_type: barcode ? barcodeType : null,
    };
    const result = product
      ? await supabase.rpc("update_product", { p_id: product.id, ...shared })
      : await supabase.rpc("create_product", { ...shared, p_initial_stock: Number(form.get("initial_stock")) });
    if (result.error) { setError(result.error.message.includes("duplicate") || result.error.code === "23505" ? "Barcode ini sudah digunakan oleh produk lain." : result.error.message); setPending(false); return; }
    const id = product?.id ?? result.data; router.push(`/products/${id}`); router.refresh();
  }

  const detected = useCallback((value: string, format: string) => { setBarcode(value); setBarcodeType(format.includes("qr") ? "qr" : format.includes("ean13") ? "ean13" : format.includes("ean8") ? "ean8" : format.includes("128") ? "code128" : "custom"); setScannerOpen(false); }, []);
  return <>
    <form className="card card-pad form-grid" onSubmit={submit}>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="form-grid two">
        <div className="field"><label htmlFor="name">Nama Produk</label><input id="name" name="name" className="input" required defaultValue={product?.name} placeholder="Minyak Kemiri Murni 60 ml" /></div>
        <div className="field"><label htmlFor="variant">Varian</label><select id="variant" name="variant" className="select" defaultValue={product?.variant ?? "Murni"}><option>Murni</option><option>Bakar</option><option>Hitam</option></select></div>
        <div className="field"><label htmlFor="size_ml">Ukuran (ml)</label><input id="size_ml" name="size_ml" className="input" type="number" min="1" required defaultValue={product?.size_ml ?? 60} /></div>
        <div className="field"><label htmlFor="sku">SKU</label><input id="sku" name="sku" className="input" required value={sku} onChange={(e)=>setSku(e.target.value.toUpperCase())} placeholder="EYFA-MURNI-60" /></div>
        <div className="field"><label htmlFor="selling_price">Harga Jual</label><input id="selling_price" name="selling_price" className="input" type="number" min="0" step="1" required defaultValue={product?.selling_price ?? 55000} /></div>
        <div className="field"><label htmlFor="hpp">HPP / Unit <span className="tiny">(opsional)</span></label><input id="hpp" name="hpp" className="input" type="number" min="0" step="1" defaultValue={product?.hpp ?? ""} placeholder="Belum diatur" /><span className="help">Kosongkan jika HPP belum diketahui.</span></div>
        {!product && <div className="field"><label htmlFor="initial_stock">Stok Awal</label><input id="initial_stock" name="initial_stock" className="input" type="number" min="0" required defaultValue="0" /></div>}
        <div className="field"><label htmlFor="low_stock_threshold">Batas Stok Menipis</label><input id="low_stock_threshold" name="low_stock_threshold" className="input" type="number" min="0" required defaultValue={product?.low_stock_threshold ?? 5} /></div>
      </div>
      <div className="divider"/>
      <div><h2>Gambar Produk</h2><div className="form-grid two"><div className="field"><label>Gunakan aset EYFA</label><select className="select" value={imageUrl} onChange={(e)=>{setImageUrl(e.target.value);setFile(null);}}>{builtInImages.map((image)=><option value={image.value} key={image.value}>{image.label}</option>)}</select></div><div className="field"><label htmlFor="image">Atau unggah gambar</label><label className="btn btn-secondary" htmlFor="image"><Upload size={18}/> {file?.name ?? "Pilih gambar"}</label><input id="image" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e)=>setFile(e.target.files?.[0] ?? null)} /></div></div>
        <div style={{position:"relative",width:130,height:110,marginTop:12,background:"var(--cream)",borderRadius:12,overflow:"hidden"}}><Image src={file ? URL.createObjectURL(file) : imageUrl} alt="Pratinjau produk" fill style={{objectFit:"contain"}} sizes="130px" /></div>
      </div>
      <div className="divider"/>
      <div><h2>Barcode / QR</h2><div className="form-grid two"><div className="field"><label htmlFor="barcode">Nilai kode</label><input id="barcode" className="input" value={barcode} onChange={(e)=>{setBarcode(e.target.value);setQrData("");}} placeholder="Opsional" /></div><div className="field"><label htmlFor="barcode_type">Jenis</label><select id="barcode_type" className="select" value={barcodeType} onChange={(e)=>setBarcodeType(e.target.value as Product["barcode_type"] ?? "custom")}><option value="qr">QR</option><option value="ean13">EAN-13</option><option value="ean8">EAN-8</option><option value="code128">Code 128</option><option value="custom">Custom</option></select></div></div>
        <div className="form-actions" style={{marginTop:12}}><button type="button" className="btn btn-secondary" onClick={()=>setScannerOpen(true)}><ScanLine size={18}/> Scan Barcode</button><button type="button" className="btn btn-secondary" onClick={generateQr}><QrCode size={18}/> Generate QR</button></div>
        {qrData && <div style={{marginTop:14,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}><Image src={qrData} alt={`QR ${barcode}`} width={150} height={150}/><div className="form-grid"><button type="button" className="btn btn-secondary" onClick={()=>navigator.clipboard.writeText(barcode)}>Salin Kode</button><a className="btn btn-secondary" href={qrData} download={`${sku || "eyfa-product"}-qr.png`}><Download size={18}/> Unduh PNG</a><button type="button" className="btn btn-secondary" onClick={()=>{const popup=window.open("","_blank","width=420,height=520");if(!popup)return;popup.document.write(`<title>Label ${sku}</title><body style="font-family:sans-serif;text-align:center;padding:24px"><img src="${qrData}" width="300" height="300"><h2>${sku}</h2><p>${barcode}</p><script>onload=()=>print()<\/script></body>`);popup.document.close();}}><Printer size={18}/> Cetak Label</button></div></div>}
      </div>
      <div className="form-actions"><button className="btn btn-primary btn-lg" disabled={pending}>{pending ? "Menyimpan..." : product ? "Simpan Perubahan" : "Simpan Produk"}</button><button type="button" className="btn btn-secondary btn-lg" onClick={()=>router.back()}><X size={18}/> Batal</button></div>
    </form>
    {scannerOpen && <BarcodeScanner onDetected={detected} onClose={()=>setScannerOpen(false)}/>} 
  </>;
}
