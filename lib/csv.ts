import type { ReportRow } from "./types";

export function csvCell(value: string | number | null) {
  const text = value === null ? "HPP belum diatur" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function salesCsv(rows: ReportRow[]) {
  const header = ["Tanggal/Waktu", "Kode Transaksi", "Produk", "Varian", "Ukuran (ml)", "Jumlah", "Harga Jual", "Omzet", "HPP/Produk", "Total HPP", "Estimasi Laba Kotor", "Metode Pembayaran", "Kasir"];
  const lines = rows.filter((row) => row.sales.status === "completed").map((row) => [
    row.sales.created_at, row.sales.transaction_code, row.product_name_snapshot, row.variant_snapshot,
    row.size_ml_snapshot, row.quantity, row.unit_selling_price, row.line_revenue, row.unit_hpp,
    row.line_cogs, row.line_gross_profit, row.sales.payment_method ?? "-", row.sales.profiles?.full_name ?? "-",
  ]);
  return `\uFEFF${[header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n")}`;
}

