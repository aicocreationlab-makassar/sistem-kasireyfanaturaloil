import { FileDown } from "lucide-react";
import type { ReportSummary } from "@/lib/report-summary";

export function ReportPdfDownload({ summary }: { summary: ReportSummary }) {
  const href = `/api/reports/pdf?from=${encodeURIComponent(summary.from)}&to=${encodeURIComponent(summary.to)}&preset=custom`;
  return (
    <a className="btn btn-primary" href={href} download>
      <FileDown size={18} /> Unduh PDF
    </a>
  );
}
