"use client";

import Image from "next/image";
import { Globe2, Instagram, Printer } from "lucide-react";
import { type SVGProps, useState } from "react";
import { flushSync } from "react-dom";
import { useToast } from "@/components/toast-provider";
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

function WhatsappIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="WhatsApp" {...props}>
      <path fill="currentColor" d="M16 3A12.8 12.8 0 0 0 5.04 22.43L3.2 29l6.73-1.77A12.8 12.8 0 1 0 16 3Zm0 23.27c-2.08 0-4.03-.61-5.67-1.66l-.4-.25-3.99 1.05 1.07-3.89-.27-.41A10.47 10.47 0 1 1 16 26.27Z" />
      <path fill="currentColor" d="M21.75 18.34c-.31-.16-1.86-.92-2.15-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.36.23-.68.08-.31-.16-1.32-.49-2.52-1.56-.93-.83-1.56-1.86-1.74-2.17-.18-.32-.02-.49.14-.65.14-.14.31-.36.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.02-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.32-1.1 1.08-1.1 2.62s1.13 3.04 1.28 3.25c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.52 1.79.67.75.24 1.44.21 1.98.13.6-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.36Z" />
    </svg>
  );
}

export function ThermalReceipt({ sale, items }: { sale: ReceiptData; items: ReceiptLine[] }) {
  const [paper, setPaper] = useState<"58" | "80">("80");
  const { toast } = useToast();

  function printReceipt(size: "58" | "80") {
    flushSync(() => setPaper(size));
    const receipt = document.querySelector<HTMLElement>("[data-thermal-receipt]");
    const printWindow = window.open("", "_blank", `popup,width=${size === "58" ? 360 : 470},height=720`);
    if (!receipt || !printWindow) {
      toast({ message: "Izinkan pop-up browser agar struk dapat dicetak.", tone: "error" });
      return;
    }

    const linkedStyles = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join("");
    const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
      .map((style) => style.outerHTML)
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>Struk EYFA</title>${linkedStyles}${inlineStyles}<style>
      @page { size: ${size}mm auto; margin: 0 !important; }
      * { box-sizing: border-box !important; }
      html, body { width: ${size}mm !important; min-width: ${size}mm !important; max-width: ${size}mm !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
      [data-thermal-receipt] { display: block !important; position: static !important; width: ${size}mm !important; min-width: ${size}mm !important; max-width: ${size}mm !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; transform: none !important; zoom: 1 !important; }
      [data-thermal-receipt] > article { width: ${size}mm !important; min-width: ${size}mm !important; max-width: ${size}mm !important; margin: 0 !important; transform: none !important; }
    </style></head><body>${receipt.outerHTML}</body></html>`);
    printWindow.addEventListener("load", async () => {
      const images = Array.from(printWindow.document.images);
      await Promise.all(images.map((image) => image.decode?.().catch(() => undefined)));
      await printWindow.document.fonts?.ready;
      printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    printWindow.document.close();
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
            <div className={styles.contact}><WhatsappIcon /><span>087872252079</span></div>
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
          <div className={styles.poweredBy}><span>Powered by</span><Image src="/dekat-lokal.png" width={100} height={25} alt="Dekat Lokal" /></div>
        </footer>
      </article>
    </div>
  </>;
}
