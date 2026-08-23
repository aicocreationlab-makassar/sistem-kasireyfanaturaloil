import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import { number, rupiah } from "@/lib/format";
import { buildReportStory, type ReportSummary } from "@/lib/report-summary";

async function pngDataUrl(fileName: string) {
  const file = await readFile(path.join(process.cwd(), "public", fileName));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export async function createReportPdf(summary: ReportSummary) {
  const [logo, dekatLokalLogo] = await Promise.all([
    pngDataUrl("logo-eyfa.png"),
    pngDataUrl("dekat-lokal.png"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Both logos keep their original aspect ratios so neither is stretched.
  doc.addImage(logo, "PNG", margin, y, 20, 20, undefined, "FAST");
  doc.setTextColor(24, 67, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Laporan EYFA Natural Oil", 43, y + 7);
  doc.setTextColor(104, 117, 108);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periode ${summary.from} s.d. ${summary.to} | Asia/Makassar`, 43, y + 13);
  y += 27;

  doc.setDrawColor(223, 229, 223);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(23, 33, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Ringkasan angka", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const metrics = [
    `Omzet: ${rupiah(summary.revenue)}`,
    `Transaksi: ${number(summary.transactions)}`,
    `Produk terjual: ${number(summary.quantity)} unit`,
    `Rata-rata transaksi: ${rupiah(summary.average)}`,
    `Total HPP: ${summary.cogs === null ? "Belum lengkap" : rupiah(summary.cogs)}`,
    `Estimasi laba kotor: ${summary.profit === null ? "Belum dapat dihitung" : rupiah(summary.profit)}`,
  ];
  metrics.forEach((line, index) => {
    const x = margin + (index % 2) * (contentWidth / 2);
    const rowY = y + Math.floor(index / 2) * 7;
    doc.text(line, x, rowY);
  });
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24, 67, 42);
  doc.text("Analisis Periode", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(23, 33, 27);
  for (const paragraph of buildReportStory(summary)) {
    const lines = doc.splitTextToSize(paragraph, contentWidth) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  }

  if (summary.topProducts.length) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 67, 42);
    doc.text("Produk dengan penjualan tertinggi", margin, y);
    y += 7;
    doc.setTextColor(23, 33, 27);
    doc.setFontSize(9.5);
    summary.topProducts.slice(0, 5).forEach((product, index) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${index + 1}. ${product.name}`, margin, y);
      doc.text(`${number(product.quantity)} unit | ${rupiah(product.revenue)}`, pageWidth - margin, y, { align: "right" });
      y += 6;
    });
  }

  doc.setDrawColor(223, 229, 223);
  doc.line(margin, 278, pageWidth - margin, 278);
  doc.setTextColor(104, 117, 108);
  doc.setFontSize(8);
  doc.text("Dibuat otomatis dari transaksi selesai. Transaksi batal tidak masuk perhitungan.", margin, 284);
  doc.text(`Dibuat ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, margin, 289);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by", 145, 286);
  const dekatLokalWidth = 26;
  const dekatLokalHeight = dekatLokalWidth * (163 / 528);
  doc.addImage(dekatLokalLogo, "PNG", 166, 282, dekatLokalWidth, dekatLokalHeight, undefined, "FAST");

  return Buffer.from(doc.output("arraybuffer"));
}
