import { describe, expect, it, vi } from "vitest";
import type { ReportSummary } from "@/lib/report-summary";

vi.mock("server-only", () => ({}));

describe("PDF laporan", () => {
  it("menghasilkan file PDF berisi data, bukan dokumen kosong", async () => {
    const { createReportPdf } = await import("@/lib/report-pdf");
    const summary: ReportSummary = {
      from: "2026-08-23",
      to: "2026-08-23",
      revenue: 110000,
      quantity: 2,
      transactions: 1,
      average: 110000,
      cogs: 50000,
      profit: 60000,
      topProducts: [{ name: "Minyak Kemiri Murni", quantity: 2, revenue: 110000 }],
      paymentCounts: { cash: 1 },
    };
    const pdf = await createReportPdf(summary);
    const pdfStructure = pdf.toString("latin1");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(50000);
    expect(pdfStructure).toContain("/Type /Page");
    expect(pdfStructure).toContain("/Subtype /Image");
    expect(pdfStructure).toContain("/Width 528\n/Height 163");
  });
});
