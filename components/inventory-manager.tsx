"use client";

import { type FormEvent, useState } from "react";
import { History, MinusCircle, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { RupiahInput } from "@/components/rupiah-input";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, rupiah, stockStatus } from "@/lib/format";
import type { Product, StockMovement } from "@/lib/types";

type Operation = { type: "add" | "subtract"; product: Product } | null;

const movementLabels: Record<StockMovement["movement_type"], string> = {
  sale: "Penjualan",
  stock_in: "Stok masuk",
  adjustment_in: "Penyesuaian +",
  adjustment_out: "Penyesuaian −",
  return: "Pengembalian void",
  initial: "Stok awal",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kendala. Silakan coba lagi.";
}

export function InventoryManager({ products, movements, canManage }: {
  products: Product[];
  movements: StockMovement[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [operation, setOperation] = useState<Operation>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [updateHpp, setUpdateHpp] = useState(false);

  function openOperation(type: "add" | "subtract", product: Product) {
    setError("");
    setUpdateHpp(false);
    setOperation({ type, product });
  }

  function closeOperation() {
    if (pending) return;
    setError("");
    setUpdateHpp(false);
    setOperation(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operation || pending) return;

    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));
    if (!Number.isInteger(quantity) || quantity < 1) {
      const message = "Jumlah stok harus berupa angka bulat minimal 1.";
      setError(message);
      toast({ message, tone: "error" });
      return;
    }
    if (operation.type === "subtract" && quantity > operation.product.stock_quantity) {
      const message = `Stok hanya tersisa ${operation.product.stock_quantity} unit. Jumlah pengurangan terlalu besar.`;
      setError(message);
      toast({ message, tone: "error" });
      return;
    }

    const unitCostText = String(form.get("unit_cost") ?? "").trim();
    const unitCost = unitCostText === "" ? null : Number(unitCostText);
    if (operation.type === "add" && updateHpp && unitCost === null) {
      const message = "Isi biaya per unit jika HPP ingin diperbarui.";
      setError(message);
      toast({ message, tone: "error" });
      return;
    }

    setPending(true);
    setError("");
    const selectedOperation = operation;

    try {
      const supabase = createClient();
      const result = selectedOperation.type === "add"
        ? await supabase.rpc("add_stock", {
            p_product_id: selectedOperation.product.id,
            p_quantity: quantity,
            p_note: String(form.get("note") || "").trim() || null,
            p_unit_cost: unitCost,
            p_update_hpp: updateHpp,
          })
        : await supabase.rpc("adjust_stock", {
            p_product_id: selectedOperation.product.id,
            p_quantity_change: -quantity,
            p_reason: String(form.get("reason") || "").trim(),
          });

      if (result.error) throw result.error;

      const newStock = typeof result.data === "number"
        ? result.data
        : selectedOperation.product.stock_quantity + (selectedOperation.type === "add" ? quantity : -quantity);
      toast({
        tone: "success",
        message: `${selectedOperation.type === "add" ? "Stok berhasil ditambah" : "Stok berhasil dikurangi"}. Stok sekarang ${newStock} unit.`,
      });
      setOperation(null);
      setUpdateHpp(false);
      router.refresh();
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="card list">
        {products.map((product) => {
          const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
          return (
            <div className="list-item" key={product.id} style={{ alignItems: "flex-start" }}>
              <div className="list-main">
                <div className="list-title">{product.name}</div>
                <div className="list-meta">
                  Batas minimum {product.low_stock_threshold} · {product.hpp === null ? "HPP belum diatur" : `HPP ${rupiah(product.hpp)}`}
                </div>
                <div style={{ marginTop: 7 }}><span className={`badge ${status.tone}`}>{status.label}</span></div>
              </div>
              <div style={{ flex: "0 0 auto" }}>
                <div className="list-value" style={{ fontSize: 22 }}>{product.stock_quantity}</div>
                <div className="tiny" style={{ textAlign: "right" }}>unit</div>
                {canManage && (
                  <div className="form-actions" style={{ marginTop: 8, gap: 5, flexWrap: "nowrap" }}>
                    <button type="button" className="btn icon-btn btn-secondary" onClick={() => openOperation("add", product)} title="Tambah stok" aria-label={`Tambah stok ${product.name}`}>
                      <PlusCircle size={19} />
                    </button>
                    <button type="button" className="btn icon-btn btn-secondary" onClick={() => openOperation("subtract", product)} title="Kurangi stok" aria-label={`Kurangi stok ${product.name}`} disabled={product.stock_quantity === 0}>
                      <MinusCircle size={19} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canManage && (
        <section className="section">
          <div className="section-head"><h2>Riwayat Pergerakan</h2><span className="tiny">50 terbaru</span></div>
          <div className="card list">
            {movements.map((movement) => (
              <div className="list-item" key={movement.id} style={{ alignItems: "flex-start" }}>
                <div className="list-main">
                  <div className="list-title">{movement.products?.name}</div>
                  <div className="list-meta">{movementLabels[movement.movement_type]} · {formatDateTime(movement.created_at)}</div>
                  <div className="tiny" style={{ overflowWrap: "anywhere" }}>{movement.reference_note || "Tanpa catatan"} · oleh {movement.profiles?.full_name || "-"}</div>
                </div>
                <div className="list-value" style={{ color: movement.quantity_change > 0 ? "var(--success)" : "var(--danger)" }}>
                  {movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}
                  <div className="tiny" style={{ whiteSpace: "nowrap" }}>{movement.stock_before} → {movement.stock_after}</div>
                </div>
              </div>
            ))}
            {!movements.length && <div className="empty"><History /><p>Belum ada pergerakan stok.</p></div>}
          </div>
        </section>
      )}

      {operation && (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeOperation()}>
          <form className="sheet form-grid" onSubmit={submit} aria-label={operation.type === "add" ? "Tambah stok" : "Kurangi stok"}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div style={{ minWidth: 0 }}>
                <p className="eyebrow">{operation.type === "add" ? "Stok Masuk" : "Kurangi Stok"}</p>
                <h2 style={{ overflowWrap: "anywhere" }}>{operation.product.name}</h2>
                <p className="subtle">Stok saat ini: {operation.product.stock_quantity} unit</p>
              </div>
              <button type="button" className="btn icon-btn" onClick={closeOperation} disabled={pending} aria-label="Tutup"><X /></button>
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            <div className="field">
              <label htmlFor="quantity">{operation.type === "add" ? "Jumlah yang ditambahkan" : "Jumlah yang dikurangi"}</label>
              <input id="quantity" name="quantity" className="input" type="number" inputMode="numeric" min="1" max={operation.type === "subtract" ? operation.product.stock_quantity : undefined} step="1" required autoFocus placeholder="Contoh: 2" />
              {operation.type === "subtract" && <span className="help">Masukkan angka positif. Sistem akan mengurangi stok secara otomatis.</span>}
            </div>

            {operation.type === "add" ? (
              <>
                <div className="field">
                  <label htmlFor="unit_cost">Biaya per unit (opsional)</label>
                  <RupiahInput id="unit_cost" name="unit_cost" />
                  <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 600 }}>
                    <input type="checkbox" checked={updateHpp} onChange={(event) => setUpdateHpp(event.target.checked)} style={{ marginTop: 3, flex: "0 0 auto" }} />
                    <span>Perbarui HPP produk dengan biaya ini</span>
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="note">Supplier / sumber / catatan</label>
                  <textarea id="note" name="note" className="textarea" />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="reason">Alasan (wajib)</label>
                <textarea id="reason" name="reason" className="textarea" required minLength={3} placeholder="Rusak, sampel, koreksi hitung..." />
              </div>
            )}

            <button className={`btn ${operation.type === "subtract" ? "btn-danger" : "btn-primary"} btn-wide btn-lg`} disabled={pending}>
              {pending ? "Menyimpan..." : operation.type === "add" ? "Tambah Stok" : "Kurangi Stok"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
