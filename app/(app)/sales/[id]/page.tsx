import { notFound } from "next/navigation";
import { ThermalReceipt } from "@/components/thermal-receipt";
import { VoidSaleButton } from "@/components/void-sale-button";
import { getSale, getSessionContext } from "@/lib/data";
import { formatDateTime, rupiah } from "@/lib/format";

export const metadata = { title: "Detail Transaksi" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getSessionContext();
  let result;
  try {
    result = await getSale(id);
  } catch {
    return notFound();
  }
  const { sale, items } = result;

  return <main className="page">
    <div className="page-head">
      <div>
        <p className="eyebrow">Detail Transaksi</p>
        <h1>{sale.transaction_code}</h1>
        <p className="subtle">{formatDateTime(sale.created_at)} · {sale.profiles?.full_name || "-"}</p>
      </div>
      <span className={`badge ${sale.status === "completed" ? "success" : "danger"}`}>
        {sale.status === "completed" ? "Selesai" : "Dibatalkan"}
      </span>
    </div>

    {sale.status === "voided" && <div className="error">
      Dibatalkan {sale.voided_at ? formatDateTime(sale.voided_at) : ""}. Alasan: {sale.void_reason}
    </div>}

    <section className="card card-pad section">
      <h2>Produk</h2>
      {items.map((item) => <div className="cart-row" key={item.id}>
        <div>
          <h3>{item.product_name_snapshot}</h3>
          <div className="tiny">{item.sku_snapshot} · {item.quantity} × {rupiah(item.unit_selling_price)}</div>
          {profile.role !== "cashier" && <div className="tiny">HPP/unit: {item.unit_hpp === null ? "Belum diatur" : rupiah(item.unit_hpp)}</div>}
        </div>
        <div className="list-value">{rupiah(item.line_revenue)}</div>
      </div>)}
      <div className="total-row"><span>Total</span><strong>{rupiah(sale.total_amount)}</strong></div>
      {sale.amount_received != null && <>
        <div className="total-row"><span>Uang diterima</span><strong>{rupiah(sale.amount_received)}</strong></div>
        <div className="total-row"><span>Kembalian</span><strong>{rupiah(sale.change_amount ?? 0)}</strong></div>
      </>}
      {profile.role !== "cashier" && <>
        <div className="total-row"><span>Total HPP</span><strong>{sale.total_cogs === null ? "HPP belum lengkap" : rupiah(sale.total_cogs)}</strong></div>
        <div className="total-row"><span>Estimasi Laba Kotor</span><strong>{sale.gross_profit === null ? "Belum dapat dihitung" : rupiah(sale.gross_profit)}</strong></div>
      </>}
      <div className="tiny" style={{ marginTop: 12 }}>
        Metode pembayaran: <strong>{sale.payment_method || "-"}</strong>{sale.note && ` · ${sale.note}`}
      </div>
    </section>

    <section className="card card-pad section">
      <h2>Cetak struk thermal</h2>
      <p className="subtle">Pilih ukuran sesuai printer. Atur margin printer ke “None” atau 0 agar hasil cetak rapi.</p>
      <ThermalReceipt
        sale={{
          transactionCode: sale.transaction_code,
          createdAt: sale.created_at,
          cashierName: sale.profiles?.full_name,
          paymentMethod: sale.payment_method,
          total: sale.total_amount,
          amountReceived: sale.amount_received,
          change: sale.change_amount,
          note: sale.note,
          status: sale.status,
        }}
        items={items.map((item) => ({
          id: item.id,
          name: item.product_name_snapshot,
          sku: item.sku_snapshot,
          quantity: item.quantity,
          unitPrice: item.unit_selling_price,
        }))}
      />
    </section>

    {profile.role !== "cashier" && sale.status === "completed" && <div className="section">
      <VoidSaleButton saleId={sale.id} />
    </div>}
  </main>;
}
