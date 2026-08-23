"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Minus,
  PackageOpen,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ThermalReceipt, type ReceiptLine } from "@/components/thermal-receipt";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { number, parseRupiahInput, rupiah, stockStatus } from "@/lib/format";
import type { CartItem, PaymentMethod, Product } from "@/lib/types";
import styles from "./cashier-pos.module.css";

let cashTenderRpcAvailable: boolean | undefined;

interface SuccessSale {
  id: string;
  code: string;
  total: number;
  createdAt: string;
  paymentMethod: PaymentMethod;
  amountReceived: number | null;
  change: number | null;
  note: string | null;
  items: ReceiptLine[];
}

function formatMoneyInput(value: string | number) {
  const amount = parseRupiahInput(value);
  return amount ? number(amount) : "";
}

export function CashierPos({
  initialProducts,
  todayRevenue,
  canRegister,
  cashierName,
}: {
  initialProducts: Product[];
  todayRevenue: number;
  canRegister: boolean;
  cashierName: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unknownCode, setUnknownCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessSale | null>(null);
  const { toast } = useToast();
  const idempotency = useRef(crypto.randomUUID());

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    toast({ tone: kind, message });
  }, [toast]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.name} ${product.variant} ${product.size_ml} ${product.sku} ${product.barcode_value ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const cartQuantities = useMemo(
    () => new Map(cart.map((item) => [item.product.id, item.quantity])),
    [cart],
  );
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0),
    [cart],
  );
  const amountReceived = parseRupiahInput(cashReceived);
  const cashIsEnough = payment !== "cash" || amountReceived >= total;
  const change = payment === "cash" && cashIsEnough ? amountReceived - total : 0;
  const quickCashAmounts = useMemo(() => {
    if (!total) return [];
    return [...new Set([
      total,
      Math.ceil(total / 10_000) * 10_000,
      Math.ceil(total / 50_000) * 50_000,
      Math.ceil(total / 100_000) * 100_000,
    ])].filter((value) => value >= total).slice(0, 4);
  }, [total]);

  useEffect(() => {
    setProducts(initialProducts);
    setCart((current) => current.flatMap((item) => {
      const fresh = initialProducts.find((product) => product.id === item.product.id);
      if (!fresh || !fresh.is_active || fresh.stock_quantity === 0) return [];
      return [{ product: fresh, quantity: Math.min(item.quantity, fresh.stock_quantity) }];
    }));
  }, [initialProducts]);

  const addOne = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      showToast("error", `${product.name} sedang habis.`);
      return false;
    }
    if ((cartQuantities.get(product.id) ?? 0) >= product.stock_quantity) {
      showToast("error", `Jumlah ${product.name} sudah mencapai stok tersedia.`);
      return false;
    }
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if ((existing?.quantity ?? 0) >= product.stock_quantity) return current;
      if (existing) {
        return current.map((item) => item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }
      return [...current, { product, quantity: 1 }];
    });
    if (navigator.vibrate) navigator.vibrate(20);
    return true;
  }, [cartQuantities, showToast]);

  function changeCart(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const nextQuantity = item.quantity + delta;
      if (nextQuantity <= 0) return [];
      return [{ ...item, quantity: Math.min(nextQuantity, item.product.stock_quantity) }];
    }));
    setError("");
  }

  const detected = useCallback((value: string) => {
    setScannerOpen(false);
    const product = products.find((item) => item.barcode_value === value || item.sku === value);
    if (product) {
      setUnknownCode("");
      if (addOne(product)) showToast("success", `${product.name} ditambahkan 1 ke transaksi.`);
      return;
    }
    setUnknownCode(value);
    showToast("error", "Kode berhasil dipindai, tetapi produknya belum terdaftar.");
  }, [addOne, products, showToast]);

  function scrollToCart() {
    document.getElementById("cashier-cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length || pending) return;
    if (!cashIsEnough) {
      const message = `Uang diterima masih kurang ${rupiah(total - amountReceived)}.`;
      setError(message);
      showToast("error", message);
      return;
    }

    const soldCart = cart.map((item) => ({ ...item, product: { ...item.product } }));
    const receiptItems: ReceiptLine[] = soldCart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.product.selling_price,
    }));

    setError("");
    setPending(true);
    const supabase = createClient();
    const saleArguments = {
      p_items: soldCart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      p_payment_method: payment,
      p_note: note || null,
      p_idempotency_key: idempotency.current,
    };
    let response = cashTenderRpcAvailable === false
      ? await supabase.rpc("create_sale", saleArguments)
      : await supabase.rpc("create_sale_with_payment", {
          ...saleArguments,
          p_amount_received: payment === "cash" ? amountReceived : null,
        });

    // Keep checkout available while an existing deployment is waiting for the
    // incremental migration. Remember the result to avoid repeated discovery calls.
    if (response.error?.code === "PGRST202") {
      cashTenderRpcAvailable = false;
      response = await supabase.rpc("create_sale", saleArguments);
    } else if (!response.error) {
      cashTenderRpcAvailable = true;
    }
    const { data, error: rpcError } = response;

    if (rpcError) {
      const message = /stok|uang|pembayaran|kunci transaksi/i.test(rpcError.message)
        ? rpcError.message
        : "Transaksi belum tersimpan. Periksa koneksi lalu coba lagi.";
      setError(message);
      setPending(false);
      showToast("error", message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.sale_id || !result?.transaction_code) {
      const message = "Respons transaksi tidak lengkap. Periksa riwayat penjualan sebelum mencoba lagi.";
      setError(message);
      setPending(false);
      showToast("error", message);
      return;
    }

    const paid = payment === "cash"
      ? Number(result.amount_received ?? amountReceived)
      : null;
    const returned = payment === "cash"
      ? Number(result.change_amount ?? change)
      : null;
    setSuccess({
      id: result.sale_id,
      code: result.transaction_code,
      total: Number(result.total),
      createdAt: new Date().toISOString(),
      paymentMethod: payment,
      amountReceived: paid,
      change: returned,
      note: note || null,
      items: receiptItems,
    });

    const soldQuantities = new Map(soldCart.map((item) => [item.product.id, item.quantity]));
    setProducts((current) => current.map((product) => ({
      ...product,
      stock_quantity: Math.max(0, product.stock_quantity - (soldQuantities.get(product.id) ?? 0)),
    })));
    setCart([]);
    setPending(false);
    setNote("");
    setCashReceived("");
    setPayment("cash");
    idempotency.current = crypto.randomUUID();
    showToast("success", `Transaksi ${result.transaction_code} berhasil disimpan.`);
  }

  return <>
    <div className={`page ${totalItems ? styles.pageWithCart : ""}`}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Kasir</p>
          <h1>Penjualan baru</h1>
          <p className="subtle">Hari ini <strong>{rupiah(todayRevenue)}</strong></p>
        </div>
        <span className="badge success">● Realtime</span>
      </div>

      <button className="scan-cta" onClick={() => { setUnknownCode(""); setScannerOpen(true); }}>
        <div><strong>Scan Produk</strong><span>Scan langsung menambahkan 1 item</span></div>
        <div className="scan-icon"><ScanLine size={30} /></div>
      </button>

      {unknownCode && <div className="card card-pad section">
        <h3>Produk belum terdaftar</h3>
        <p className="subtle">Kode: <strong>{unknownCode}</strong></p>
        <div className="form-actions">
          {canRegister && <Link className="btn btn-primary" href={`/products/new?barcode=${encodeURIComponent(unknownCode)}`} prefetch>Daftarkan Produk</Link>}
          <button className="btn btn-secondary" onClick={() => setScannerOpen(true)}>Scan Ulang</button>
        </div>
      </div>}

      <div className={styles.workspace}>
        <section className={styles.catalog}>
          <div className="section-head section">
            <h2>Pilih produk</h2>
            <span className="tiny">{products.length} produk aktif</span>
          </div>
          <div className="input-icon">
            <Search />
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, ukuran, SKU..." aria-label="Cari produk" />
          </div>

          <div className="grid product-grid section" style={{ marginTop: 14 }}>
            {filtered.map((product) => {
              const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
              const inCart = cartQuantities.get(product.id) ?? 0;
              return <button
                key={product.id}
                className={styles.productButton}
                onClick={() => addOne(product)}
                disabled={product.stock_quantity === 0}
                aria-label={`${product.name}, ${rupiah(product.selling_price)}. ${inCart ? `${inCart} di transaksi. ` : ""}Klik untuk menambah satu.`}
              >
                {inCart > 0 && <span className={styles.quantityBadge}>{inCart}</span>}
                <div className="product-img">
                  <Image src={product.image_url || "/logo-eyfa.png"} alt={product.name} fill sizes="(max-width:680px) 50vw, (max-width:1000px) 33vw, 230px" />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="product-price">{rupiah(product.selling_price)}</div>
                  <div className="stock-row"><span>Stok {number(product.stock_quantity)}</span><span className={`badge ${status.tone}`}>{status.label}</span></div>
                  <div className={styles.tapHint}><Plus /> {product.stock_quantity ? "Klik untuk tambah" : "Stok habis"}</div>
                </div>
              </button>;
            })}
          </div>
          {!filtered.length && <div className="empty"><PackageOpen /><p>Produk tidak ditemukan.</p></div>}
        </section>

        <aside id="cashier-cart" className={`card section ${styles.cartPanel}`} aria-label="Keranjang transaksi">
          <div className={styles.cartHeader}>
            <div><p className="eyebrow">Transaksi</p><h2>Keranjang</h2></div>
            <span className={`badge ${totalItems ? "success" : "muted"} ${styles.cartCount}`}>{totalItems} item</span>
          </div>
          <div className={styles.cartBody}>
            {!cart.length && <div className={styles.emptyCart}>
              <ShoppingCart />
              <p>Keranjang masih kosong</p>
              <span className="tiny">Klik kartu produk atau scan barcode untuk menambah item.</span>
            </div>}

            {cart.map((item) => <div className={styles.cartItem} key={item.product.id}>
              <div>
                <h3>{item.product.name}</h3>
                <span className="tiny">{rupiah(item.product.selling_price)} / unit</span>
                <div className={styles.cartPrice}>{rupiah(item.product.selling_price * item.quantity)}</div>
              </div>
              <div className={styles.controls}>
                <button type="button" onClick={() => changeCart(item.product.id, -1)} aria-label={`Kurangi ${item.product.name}`}><Minus size={16} /></button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => changeCart(item.product.id, 1)} disabled={item.quantity >= item.product.stock_quantity} aria-label={`Tambah ${item.product.name}`}><Plus size={16} /></button>
                <button type="button" className={styles.remove} onClick={() => setCart((current) => current.filter((entry) => entry.product.id !== item.product.id))} aria-label={`Hapus ${item.product.name}`}><Trash2 size={16} /></button>
              </div>
            </div>)}

            {cart.length > 0 && <form className={styles.checkoutForm} onSubmit={checkout}>
              <div className="field">
                <label htmlFor="payment-method">Metode pembayaran</label>
                <select id="payment-method" className="select" value={payment} onChange={(event) => { setPayment(event.target.value as PaymentMethod); setError(""); }}>
                  <option value="cash">Tunai</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              {payment === "cash" && <div className="field">
                <label htmlFor="cash-received">Uang diterima</label>
                <div className={styles.moneyInput}>
                  <span className={styles.moneyPrefix}>Rp</span>
                  <input
                    id="cash-received"
                    className="input"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={cashReceived}
                    onChange={(event) => { setCashReceived(formatMoneyInput(event.target.value)); setError(""); }}
                    aria-describedby="cash-change"
                    required
                  />
                </div>
                <div className={styles.quickCash} aria-label="Pilihan nominal cepat">
                  {quickCashAmounts.map((amount) => <button type="button" key={amount} onClick={() => setCashReceived(formatMoneyInput(amount))}>
                    {amount === total ? "Uang pas" : rupiah(amount)}
                  </button>)}
                </div>
                <div id="cash-change" className={`${styles.changeBox} ${cashReceived && !cashIsEnough ? styles.insufficient : ""}`} aria-live="polite">
                  <span>{cashReceived && !cashIsEnough ? "Masih kurang" : "Kembalian"}</span>
                  <strong>{rupiah(cashReceived && !cashIsEnough ? total - amountReceived : change)}</strong>
                </div>
              </div>}

              <div className="field">
                <label htmlFor="sale-note">Catatan (opsional)</label>
                <input id="sale-note" className="input" value={note} onChange={(event) => setNote(event.target.value)} maxLength={250} />
              </div>

              {error && <div className="error" role="alert">{error}</div>}
              <div className={styles.total}><strong>Total</strong><strong>{rupiah(total)}</strong></div>
              <button className="btn btn-primary btn-wide btn-lg" disabled={pending || !cart.length || !cashIsEnough}>
                {pending ? "Menyimpan transaksi..." : "Bayar & Simpan"}
              </button>
            </form>}
          </div>
        </aside>
      </div>
    </div>

    {totalItems > 0 && <button className={`btn btn-primary btn-lg ${styles.stickySummary}`} onClick={scrollToCart}>
      <ShoppingCart size={20} />
      <span>{totalItems} item · {rupiah(total)}</span>
      <ChevronRight size={20} />
    </button>}

    {success && <div className="sheet-backdrop">
      <section className="sheet" role="alertdialog" aria-modal="true" aria-label="Transaksi berhasil">
        <div className="sheet-handle" />
        <div className={styles.successSummary}>
          <CheckCircle2 size={54} color="var(--success)" />
          <h2>Transaksi berhasil</h2>
          <p className="subtle">{success.code}</p>
          <div className={styles.successTotal}>{rupiah(success.total)}</div>
          {success.change != null && <div className={styles.successChange}>Kembalian pelanggan: <strong>{rupiah(success.change)}</strong></div>}
        </div>
        <ThermalReceipt
          sale={{
            transactionCode: success.code,
            createdAt: success.createdAt,
            cashierName,
            paymentMethod: success.paymentMethod,
            total: success.total,
            amountReceived: success.amountReceived,
            change: success.change,
            note: success.note,
          }}
          items={success.items}
        />
        <div className={styles.successActions}>
          <button className="btn btn-primary btn-wide" onClick={() => setSuccess(null)}>Transaksi Baru</button>
          <Link className="btn btn-secondary btn-wide" href={`/sales/${success.id}`} prefetch>Lihat Detail Transaksi</Link>
        </div>
      </section>
    </div>}

    {scannerOpen && <BarcodeScanner onDetected={detected} onClose={() => setScannerOpen(false)} />}
  </>;
}
