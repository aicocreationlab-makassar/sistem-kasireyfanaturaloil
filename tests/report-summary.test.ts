import { describe, expect, it } from "vitest";
import { buildReportStory, type ReportSummary } from "@/lib/report-summary";

const base: ReportSummary = {
  from: "2026-08-23",
  to: "2026-08-23",
  revenue: 220000,
  quantity: 4,
  transactions: 2,
  average: 110000,
  cogs: 100000,
  profit: 120000,
  topProducts: [{ name: "Minyak Kemiri Murni", quantity: 3, revenue: 165000 }],
  paymentCounts: { cash: 1, qris: 1 },
};

describe("buildReportStory", () => {
  it("menceritakan omzet, produk unggulan, margin, dan pembayaran", () => {
    const story = buildReportStory(base).join(" ");
    expect(story.replace(/\s/g, "")).toContain("Rp220.000");
    expect(story).toContain("Minyak Kemiri Murni");
    expect(story).toContain("54.5%");
    expect(story).toContain("QRIS");
  });

  it("memberi arahan saat tidak ada transaksi", () => {
    const story = buildReportStory({ ...base, revenue: 0, quantity: 0, transactions: 0, average: 0, cogs: 0, profit: 0, topProducts: [], paymentCounts: {} });
    expect(story.join(" ")).toContain("belum ada transaksi");
  });
});
