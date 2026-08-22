"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Minus, PackageOpen, Plus, ScanLine, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { createClient } from "@/lib/supabase/client";
import { number, rupiah, stockStatus } from "@/lib/format";
import type { CartItem, PaymentMethod, Product } from "@/lib/types";

export function CashierPos({ initialProducts, todayRevenue, canRegister }: { initialProducts: Product[]; todayRevenue: number; canRegister: boolean }) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unknownCode, setUnknownCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string; code: string; total: number } | null>(null);
  const idempotency = useRef(crypto.randomUUID());
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase(); if (!query) return products;
    return products.filter((p) => `${p.name} ${p.variant} ${p.size_ml} ${p.sku} ${p.barcode_value ?? ""}`.toLowerCase().includes(query));
  }, [products, search]);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);

  useEffect(() => {
    setProducts(initialProducts);
    setCart((current) => current.flatMap((item) => {
      const fresh = initialProducts.find((product) => product.id === item.product.id);
      if (!fresh || !fresh.is_active || fresh.stock_quantity === 0) return [];
      return [{ product: fresh, quantity: Math.min(item.quantity, fresh.stock_quantity) }];
    }));
    setSelected((current) => current ? initialProducts.find((product) => product.id === current.id) ?? null : null);
  }, [initialProducts]);

  function openProduct(product: Product) { if (product.stock_quantity === 0) return; setQuantity(1); setSelected(product); }
  function addSelected() {
    if (!selected) return;
    setCart((current) => {
      const existing = current.find((item) => item.product.id === selected.id);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > selected.stock_quantity) return current;
      return existing ? current.map((item) => item.product.id === selected.id ? { ...item, quantity: nextQuantity } : item) : [...current, { product: selected, quantity }];
    }); setSelected(null);
  }
  function changeCart(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const quantityNext = item.quantity + delta;
      if (quantityNext <= 0) return [];
      return [{ ...item, quantity: Math.min(quantityNext, item.product.stock_quantity) }];
    }));
  }
  const detected = useCallback((value: string) => {
    setScannerOpen(false);
    const product = products.find((item) => item.barcode_value === value || item.sku === value);
    if (product) { setUnknownCode(""); openProduct(product); } else setUnknownCode(value);
  }, [products]);

  async function checkout(event: FormEvent) {
    event.preventDefault(); if (!cart.length || pending) return;
    setError(""); setPending(true);
    const { data, error: rpcError } = await createClient().rpc("create_sale", {
      p_items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      p_payment_method: payment, p_note: note || null, p_idempotency_key: idempotency.current,
    });
    if (rpcError) { setError(rpcError.message.includes("Stok") ? rpcError.message : "Transaksi belum tersimpan karena koneksi terputus. Coba lagi."); setPending(false); return; }
    const result = Array.isArray(data) ? data[0] : data;
    setSuccess({ id: result.sale_id, code: result.transaction_code, total: Number(result.total) });
    setCart([]); setCartOpen(false); setPending(false); setNote(""); idempotency.current = crypto.randomUUID();
  }

  return <>
    <div className="page">
      <div className="page-head"><div><p className="eyebrow">Kasir</p><h1>Penjualan baru</h1><p className="subtle">Hari ini <strong>{rupiah(todayRevenue)}</strong></p></div><span className="badge success">● Realtime</span></div>
      <button className="scan-cta" onClick={() => { setUnknownCode(""); setScannerOpen(true); }}><div><strong>Scan Produk</strong><span>Barcode atau QR dengan kamera</span></div><div className="scan-icon"><ScanLine size={30} /></div></button>
      {unknownCode && <div className="card card-pad section"><h3>Produk belum terdaftar</h3><p className="subtle">Kode: <strong>{unknownCode}</strong></p><div className="form-actions">{canRegister && <Link className="btn btn-primary" href={`/products/new?barcode=${encodeURIComponent(unknownCode)}`}>Daftarkan Produk</Link>}<button className="btn btn-secondary" onClick={() => setScannerOpen(true)}>Scan Ulang</button></div></div>}
      <div className="section-head section"><h2>Pilih produk</h2><span className="tiny">{products.length} produk aktif</span></div>
      <div className="input-icon"><Search /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, ukuran, SKU..." aria-label="Cari produk" /></div>
      <div className="grid product-grid section" style={{marginTop:14}}>
        {filtered.map((product) => { const status = stockStatus(product.stock_quantity, product.low_stock_threshold); return <button key={product.id} className="product-card card" onClick={() => openProduct(product)} disabled={product.stock_quantity === 0}>
          <div className="product-img"><Image src={product.image_url || "/logo-eyfa.png"} alt={product.name} fill sizes="(max-width:680px) 50vw, (max-width:1000px) 33vw, 230px" /></div>
          <div className="product-info"><h3>{product.name}</h3><div className="product-price">{rupiah(product.selling_price)}</div><div className="stock-row"><span>Stok {number(product.stock_quantity)}</span><span className={`badge ${status.tone}`}>{status.label}</span></div></div>
        </button>; })}
      </div>
      {!filtered.length && <div className="empty"><PackageOpen /><p>Produk tidak ditemukan.</p></div>}
    </div>

    {totalItems > 0 && !cartOpen && <button className="cart-fab btn btn-primary btn-lg" onClick={() => setCartOpen(true)}><ShoppingCart size={20} /> <span>{totalItems} item · {rupiah(total)}</span><ChevronRight size={20} /></button>}
    {selected && <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><section className="sheet" role="dialog" aria-modal="true" aria-label="Atur jumlah produk"><div className="sheet-handle" /><div className="sheet-head"><div><h2>{selected.name}</h2><p className="subtle">{rupiah(selected.selling_price)} · Stok {selected.stock_quantity}</p></div><button className="btn icon-btn" onClick={() => setSelected(null)} aria-label="Tutup"><X /></button></div>
      <div className="quantity"><button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kurangi"><Minus /></button><strong>{quantity}</strong><button onClick={() => setQuantity((q) => Math.min(selected.stock_quantity, q + 1))} aria-label="Tambah"><Plus /></button></div>
      <div className="total-row"><span>Subtotal</span><strong>{rupiah(selected.selling_price * quantity)}</strong></div><button className="btn btn-primary btn-wide btn-lg" onClick={addSelected}>Tambah ke Transaksi</button>
    </section></div>}

    {cartOpen && <div className="sheet-backdrop"><form className="sheet" onSubmit={checkout}><div className="sheet-handle" /><div className="sheet-head"><div><p className="eyebrow">Keranjang</p><h2>{totalItems} item dipilih</h2></div><button type="button" className="btn icon-btn" onClick={() => setCartOpen(false)}><X /></button></div>
      {cart.map((item) => <div className="cart-row" key={item.product.id}><div><h3>{item.product.name}</h3><span className="tiny">{rupiah(item.product.selling_price)} / unit</span><div className="product-price">{rupiah(item.product.selling_price * item.quantity)}</div></div><div className="cart-controls"><button type="button" onClick={() => changeCart(item.product.id,-1)} aria-label="Kurangi"><Minus size={16}/></button><span>{item.quantity}</span><button type="button" onClick={() => changeCart(item.product.id,1)} aria-label="Tambah"><Plus size={16}/></button><button type="button" onClick={() => setCart((c)=>c.filter((i)=>i.product.id!==item.product.id))} aria-label="Hapus"><Trash2 size={16}/></button></div></div>)}
      <div className="form-grid section"><div className="field"><label>Metode pembayaran</label><select className="select" value={payment} onChange={(e)=>setPayment(e.target.value as PaymentMethod)}><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="other">Lainnya</option></select></div><div className="field"><label>Catatan (opsional)</label><input className="input" value={note} onChange={(e)=>setNote(e.target.value)} maxLength={250}/></div></div>
      {error && <div className="error section" role="alert">{error}</div>}<div className="total-row section"><strong>Total</strong><strong>{rupiah(total)}</strong></div><button className="btn btn-primary btn-wide btn-lg" disabled={pending || !cart.length}>{pending ? "Menyimpan..." : "Simpan Transaksi"}</button>
    </form></div>}

    {success && <div className="sheet-backdrop"><section className="sheet" role="alertdialog" aria-modal="true"><div className="sheet-handle"/><div style={{textAlign:"center",padding:"12px 0 20px"}}><CheckCircle2 size={54} color="var(--success)" style={{margin:"auto"}}/><h2 style={{marginTop:14}}>Transaksi berhasil</h2><p className="subtle">{success.code}</p><div style={{fontSize:28,fontWeight:850}}>{rupiah(success.total)}</div></div><div className="form-actions"><button className="btn btn-primary" style={{flex:1}} onClick={()=>setSuccess(null)}>Transaksi Baru</button><Link className="btn btn-secondary" style={{flex:1}} href={`/sales/${success.id}`}>Lihat Detail</Link></div></section></div>}
    {scannerOpen && <BarcodeScanner onDetected={detected} onClose={() => setScannerOpen(false)} />}
  </>;
}
