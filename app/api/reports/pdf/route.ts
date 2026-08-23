import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/data";
import { loadReportRows, resolveReportPeriod, summarizeReportRows } from "@/lib/report-data";
import { createReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { supabase } = await requireAdmin();
  const { searchParams } = request.nextUrl;
  const { from, to } = resolveReportPeriod({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    preset: searchParams.get("preset") || "custom",
  });
  const rows = await loadReportRows(supabase, from, to);
  const pdf = await createReportPdf(summarizeReportRows(rows, from, to));
  const filename = `eyfa-laporan-${from}-sampai-${to}.pdf`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
