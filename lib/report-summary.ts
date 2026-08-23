import { number, rupiah } from "@/lib/format";

export interface ReportProductSummary {
  name: string;
  quantity: number;
  revenue: number;
}

export interface ReportSummary {
  from: string;
  to: string;
  revenue: number;
  quantity: number;
  transactions: number;
  average: number;
  cogs: number | null;
  profit: number | null;
  topProducts: ReportProductSummary[];
  paymentCounts: Record<string, number>;
}

const paymentLabels: Record<string, string> = {
  cash: "tunai",
  transfer: "transfer",
  qris: "QRIS",
  other: "lainnya",
};

export function buildReportStory(summary: ReportSummary) {
  const period = summary.from === summary.to
    ? `tanggal ${summary.from}`
    : `periode ${summary.from} sampai ${summary.to}`;

  if (summary.transactions === 0) {
    return [
      `Pada ${period}, belum ada transaksi penjualan yang selesai tercatat. Omzet dan jumlah produk terjual masih nol.`,
      "Owner dapat menggunakan waktu ini untuk memeriksa kesiapan stok, memastikan produk aktif tersedia, dan menyiapkan kegiatan promosi berikutnya.",
    ];
  }

  const paragraphs = [
    `Pada ${period}, EYFA mencatat ${number(summary.transactions)} transaksi selesai dengan omzet ${rupiah(summary.revenue)}. Sebanyak ${number(summary.quantity)} unit produk terjual, dengan nilai rata-rata ${rupiah(summary.average)} per transaksi.`,
  ];

  const best = summary.topProducts[0];
  if (best) {
    const share = summary.quantity ? (best.quantity / summary.quantity) * 100 : 0;
    paragraphs.push(
      `${best.name} menjadi produk terlaris dengan ${number(best.quantity)} unit atau sekitar ${share.toFixed(1)}% dari seluruh unit terjual. Kontribusi omzet produk ini mencapai ${rupiah(best.revenue)}.`,
    );
  }

  if (summary.profit === null || summary.cogs === null) {
    paragraphs.push("Estimasi laba kotor belum dapat dihitung dengan lengkap karena masih ada produk yang belum memiliki snapshot HPP. Lengkapi HPP agar keputusan margin lebih akurat.");
  } else {
    const margin = summary.revenue ? (summary.profit / summary.revenue) * 100 : 0;
    paragraphs.push(`Total HPP tercatat ${rupiah(summary.cogs)}, sehingga estimasi laba kotor adalah ${rupiah(summary.profit)} dengan margin ${margin.toFixed(1)}%.`);
  }

  const paymentSummary = Object.entries(summary.paymentCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => `${paymentLabels[method] ?? method} ${number(count)}`)
    .join(", ");
  if (paymentSummary) paragraphs.push(`Komposisi metode pembayaran pada periode ini: ${paymentSummary} transaksi.`);

  return paragraphs;
}
