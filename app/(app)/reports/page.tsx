import Form from "next/form";
import Link from "next/link";
import { BarChart3, BookOpenText } from "lucide-react";
import { CsvDownload } from "@/components/csv-download";
import { ReportPdfDownload } from "@/components/report-pdf-download";
import { requireAdmin } from "@/lib/data";
import { number, rupiah } from "@/lib/format";
import { loadReportRows, resolveReportPeriod, summarizeReportRows } from "@/lib/report-data";
import { buildReportStory, type ReportSummary } from "@/lib/report-summary";

export const metadata = { title: "Laporan" };

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { from, to, preset } = resolveReportPeriod(params);
  const rows = await loadReportRows(supabase, from, to);
  const summary: ReportSummary = summarizeReportRows(rows, from, to);
  const { revenue, quantity, transactions, average, cogs, profit, topProducts } = summary;
  const best = topProducts[0];
  const story = buildReportStory(summary);
  const links = [
    { key: "today", label: "Hari Ini" },
    { key: "yesterday", label: "Kemarin" },
    { key: "7days", label: "7 Hari" },
    { key: "month", label: "Bulan Ini" },
  ];

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Analisis penjualan</p>
          <h1>Laporan</h1>
          <p className="subtle">Berdasarkan snapshot harga dan HPP saat transaksi.</p>
        </div>
        <div className="report-actions">
          <CsvDownload rows={rows} from={from} to={to} />
          <ReportPdfDownload summary={summary} />
        </div>
      </div>

      <div className="filters">
        {links.map((link) => <Link key={link.key} href={`/reports?preset=${link.key}`} prefetch className={`filter ${preset === link.key ? "active" : ""}`}>{link.label}</Link>)}
      </div>

      <Form className="card card-pad form-grid two section" action="/reports">
        <input type="hidden" name="preset" value="custom" />
        <div className="field"><label htmlFor="from">Dari tanggal</label><input id="from" name="from" className="input" type="date" defaultValue={from} required /></div>
        <div className="field"><label htmlFor="to">Sampai tanggal</label><input id="to" name="to" className="input" type="date" defaultValue={to} required /></div>
        <button className="btn btn-secondary">Terapkan Rentang</button>
      </Form>

      <p className="subtle section">Periode <strong>{from}</strong> sampai <strong>{to}</strong> · zona waktu Asia/Makassar</p>

      <div className="grid metrics">
        <article className="card metric primary"><div className="label">Omzet</div><div className="value">{rupiah(revenue)}</div><div className="tiny">{transactions} transaksi</div></article>
        <article className="card metric"><div className="label">Produk Terjual</div><div className="value">{number(quantity)}</div><div className="tiny">unit</div></article>
        <article className="card metric"><div className="label">Total HPP</div><div className="value">{cogs === null ? "—" : rupiah(cogs)}</div><div className="tiny">{cogs === null ? "HPP belum lengkap" : "Snapshot transaksi"}</div></article>
        <article className="card metric"><div className="label">Estimasi Laba Kotor</div><div className="value">{profit === null ? "—" : rupiah(profit)}</div><div className="tiny">{profit === null ? "Belum dapat dihitung" : `${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}% margin`}</div></article>
      </div>

      <section className="card card-pad report-story section">
        <div className="report-story-title"><BookOpenText aria-hidden="true" /><div><p className="eyebrow">Analisis otomatis</p><h2>Ringkasan Periode</h2></div></div>
        {story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>

      <div className="split section">
        <section className="card card-pad"><p className="eyebrow">Rata-rata transaksi</p><div style={{ fontSize: 28, fontWeight: 850 }}>{rupiah(average)}</div></section>
        <section className="card card-pad"><p className="eyebrow">Produk terlaris</p><h2>{best?.name || "Belum ada data"}</h2>{best && <p className="subtle">{number(best.quantity)} unit terjual</p>}</section>
      </div>

      <section className="section">
        <h2>Rincian Produk Terjual</h2>
        <div className="card list">
          {rows.slice(0, 100).map((row) => (
            <div className="list-item" key={row.id}>
              <div className="list-main">
                <div className="list-title">{row.product_name_snapshot}</div>
                <div className="list-meta">{row.sales.transaction_code} · {row.quantity} × {rupiah(row.unit_selling_price)}</div>
                <div className="tiny">{new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date(row.sales.created_at))}</div>
              </div>
              <div className="list-value">{rupiah(row.line_revenue)}<div className="tiny">{row.line_gross_profit === null ? "HPP belum diatur" : `Laba ${rupiah(row.line_gross_profit)}`}</div></div>
            </div>
          ))}
          {!rows.length && <div className="empty"><BarChart3 /><p>Tidak ada penjualan pada periode ini.</p></div>}
        </div>
        {rows.length > 100 && <p className="tiny" style={{ marginTop: 8 }}>Menampilkan 100 baris pertama. CSV memuat seluruh {rows.length} baris.</p>}
      </section>
    </main>
  );
}
