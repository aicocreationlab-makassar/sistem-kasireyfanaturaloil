"use client";

import Image from "next/image";
import { Globe2, Instagram, MessageCircle, Printer } from "lucide-react";
import { useState } from "react";
import { formatDateTime, rupiah } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import styles from "./thermal-receipt.module.css";

export interface ReceiptLine {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptData {
  transactionCode: string;
  createdAt: string;
  cashierName?: string | null;
  paymentMethod?: PaymentMethod | null;
  total: number;
  amountReceived?: number | null;
  change?: number | null;
  note?: string | null;
  status?: "completed" | "voided";
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
  other: "Lainnya",
};

export function ThermalReceipt({ sale, items }: { sale: ReceiptData; items: ReceiptLine[] }) {
  const [paper, setPaper] = useState<"58" | "80">("80");

  function printReceipt(size: "58" | "80") {
    setPaper(size);
    document.body.classList.add("receipt-printing");
    const cleanup = () => document.body.classList.remove("receipt-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
        window.setTimeout(cleanup, 500);
      });
    });
  }

  const paymentLabel = sale.paymentMethod ? paymentLabels[sale.paymentMethod] : "-";

  return <>
    <div className={styles.actions} aria-label="Pilihan ukuran kertas struk">
      <button type="button" className="btn btn-secondary" onClick={() => printReceipt("58")}>
        <Printer size={17} /> Cetak 58 mm
      </button>
      <button type="button" className="btn btn-primary" onClick={() => printReceipt("80")}>
        <Printer size={17} /> Cetak 80 mm
      </button>
    </div>

    <div className={`${styles.printArea} ${paper === "58" ? styles.paper58 : styles.paper80}`} data-thermal-receipt>
      <article className={styles.receipt} aria-label={`Struk ${sale.transactionCode}`}>
        <header className={styles.header}>
          <Image className={styles.logo} src="/logo-eyfa.png" alt="EYFA Natural Oil" width={160} height={120} priority />
          <h1 className={styles.businessName}>EYFA Natural Oil</h1>
          <p className={styles.tagline}>Minyak kemiri alami untuk perawatan rambut</p>
          <div className={styles.contacts}>
            <div className={styles.contact}><MessageCircle aria-hidden="true" /><span>087872252079</span></div>
            <div className={styles.contact}><Instagram aria-hidden="true" /><span>@eyfanaturaloil</span></div>
            <div className={styles.contact}><Globe2 aria-hidden="true" /><span>eyfa.dekatlokal.com</span></div>
          </div>
        </header>

        <hr className={styles.rule} />
        {sale.status === "voided" && <div className={styles.voided}>DIBATALKAN</div>}
        <div className={styles.meta}>
          <div className={styles.metaRow}><span>No.</span><span>{sale.transactionCode}</span></div>
          <div className={styles.metaRow}><span>Waktu</span><span>{formatDateTime(sale.createdAt)}</span></div>
          <div className={styles.metaRow}><span>Kasir</span><span>{sale.cashierName || "-"}</span></div>
          <div className={styles.metaRow}><span>Bayar</span><span>{paymentLabel}</span></div>
        </div>
        <hr className={styles.rule} />

        <div>
          {items.map((item) => <div className={styles.item} key={item.id}>
            <div className={styles.itemName}>{item.name}{item.sku ? ` (${item.sku})` : ""}</div>
            <div className={styles.itemLine}>
              <span>{item.quantity} x {rupiah(item.unitPrice)}</span>
              <span>{rupiah(item.quantity * item.unitPrice)}</span>
            </div>
          </div>)}
        </div>

        <hr className={styles.rule} />
        <div className={styles.summary}>
          <div className={`${styles.summaryRow} ${styles.grandTotal}`}><span>TOTAL</span><strong>{rupiah(sale.total)}</strong></div>
          {sale.amountReceived != null && <div className={styles.summaryRow}><span>Diterima</span><strong>{rupiah(sale.amountReceived)}</strong></div>}
          {sale.change != null && <div className={styles.summaryRow}><span>Kembali</span><strong>{rupiah(sale.change)}</strong></div>}
        </div>
        {sale.note && <div className={styles.note}>Catatan: {sale.note}</div>}

        <footer className={styles.footer}>
          <strong>Terima kasih sudah berbelanja</strong>
          <div>Simpan struk ini sebagai bukti transaksi.</div>
          <div>Produk alami, dirawat sepenuh hati.</div>
        </footer>
      </article>
    </div>
  </>;
}
