import { describe, expect, it } from "vitest";
import { summarizeReportRows, withEffectiveHpp } from "@/lib/report-data";
import type { ReportRow } from "@/lib/types";

function reportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "item-1",
    sale_id: "sale-1",
    product_id: "product-1",
    product_name_snapshot: "Minyak Kemiri Murni",
    sku_snapshot: "EYFA-M-60",
    variant_snapshot: "Murni",
    size_ml_snapshot: 60,
    quantity: 2,
    unit_selling_price: 55000,
    unit_hpp: null,
    line_revenue: 110000,
    line_cogs: null,
    line_gross_profit: null,
    products: { hpp: 25000 },
    sales: { transaction_code: "EYFA-1", created_at: "2026-08-23T01:00:00Z", payment_method: "cash", status: "completed" },
    ...overrides,
  };
}

describe("fallback HPP laporan", () => {
  it("menggunakan HPP produk saat snapshot transaksi lama kosong", () => {
    const row = withEffectiveHpp(reportRow());
    expect(row.unit_hpp).toBe(25000);
    expect(row.line_cogs).toBe(50000);
    expect(row.line_gross_profit).toBe(60000);
    expect(summarizeReportRows([row], "2026-08-23", "2026-08-23").profit).toBe(60000);
  });

  it("tetap mengutamakan snapshot HPP transaksi yang sudah ada", () => {
    const row = withEffectiveHpp(reportRow({ unit_hpp: 20000, line_cogs: 40000, line_gross_profit: 70000 }));
    expect(row.unit_hpp).toBe(20000);
    expect(row.line_cogs).toBe(40000);
  });

  it("tetap menandai belum lengkap jika produk historis sudah tidak tersedia", () => {
    const row = withEffectiveHpp(reportRow({ product_id: null, products: null }));
    expect(summarizeReportRows([row], "2026-08-23", "2026-08-23").cogs).toBeNull();
  });
});
