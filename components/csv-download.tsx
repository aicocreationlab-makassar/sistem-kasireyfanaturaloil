"use client";

import { Download } from "lucide-react";
import { salesCsv } from "@/lib/csv";
import type { ReportRow } from "@/lib/types";

export function CsvDownload({ rows, from, to }: { rows: ReportRow[]; from: string; to: string }) {
  function download() {
    const blob = new Blob([salesCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href=url;anchor.download=`eyfa-penjualan-${from}-to-${to}.csv`;anchor.click();URL.revokeObjectURL(url);
  }
  return <button className="btn btn-secondary" onClick={download} disabled={!rows.length}><Download size={18}/> Download CSV</button>;
}
