"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { buildReportStory, type ReportSummary } from "@/lib/report-summary";
import { number, rupiah } from "@/lib/format";

async function imageDataUrl(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Logo tidak dapat dimuat");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function ReportPdfDownload({ summary }: { summary: ReportSummary }) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  async function download() {
    if (pending) return;
    setPending(true);
    try {
      const [{ jsPDF }, logo, dekatLokalLogo] = await Promise.all([
        import("jspdf"),
        imageDataUrl("/logo-eyfa.png").catch(() => null),
        imageDataUrl("/dekat-lokal.png").catch(() => null),
      ]);
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let y = 16;

      if (logo) doc.addImage(logo, "PNG", margin, y, 25, 19, undefined, "FAST");
      doc.setTextColor(24, 67, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Laporan EYFA Natural Oil", logo ? 46 : margin, y + 7);
      doc.setTextColor(104, 117, 108);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Periode ${summary.from} s.d. ${summary.to} | Asia/Makassar`, logo ? 46 : margin, y + 13);
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
      doc.text("Dibuat otomatis dari snapshot transaksi selesai. Transaksi batal tidak masuk perhitungan.", margin, 284);
      doc.text(`Dibuat ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, margin, 289);
      doc.setFont("helvetica", "normal");
      doc.text("Powered by", 145, 286);
      if (dekatLokalLogo) doc.addImage(dekatLokalLogo, "PNG", 164, 281.5, 28, 7, undefined, "FAST");
      doc.save(`eyfa-laporan-${summary.from}-sampai-${summary.to}.pdf`);
      toast({ message: "PDF laporan berhasil dibuat.", tone: "success" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "PDF laporan gagal dibuat.";
      toast({ message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="btn btn-primary" onClick={download} disabled={pending}>
      {pending ? <LoaderCircle className="motion-safe:animate-spin" size={18} /> : <FileDown size={18} />}
      {pending ? "Membuat PDF..." : "Unduh PDF"}
    </button>
  );
}
