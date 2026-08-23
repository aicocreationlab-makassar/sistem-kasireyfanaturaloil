import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateISO, makassarRange } from "@/lib/format";
import type { ReportSummary } from "@/lib/report-summary";
import type { ReportRow } from "@/lib/types";

export interface ReportPeriodParams {
  from?: string;
  to?: string;
  preset?: string;
}

function shiftDate(days: number, now: Date) {
  return localDateISO(new Date(now.getTime() + days * 86400000));
}

export function resolveReportPeriod(params: ReportPeriodParams, now = new Date()) {
  const today = localDateISO(now);
  const preset = params.preset || "today";
  let from = params.from || today;
  let to = params.to || today;

  if (preset === "yesterday") {
    from = shiftDate(-1, now);
    to = from;
  } else if (preset === "7days") {
    from = shiftDate(-6, now);
    to = today;
  } else if (preset === "month") {
    from = `${today.slice(0, 7)}-01`;
    to = today;
  }

  if (from > to) [from, to] = [to, from];
  return { from, to, preset };
}

export function withEffectiveHpp(row: ReportRow): ReportRow {
  const currentHpp = row.products?.hpp;
  const unitHpp = row.unit_hpp === null && currentHpp !== null && currentHpp !== undefined
    ? Number(currentHpp)
    : row.unit_hpp === null ? null : Number(row.unit_hpp);
  const lineCogs = row.line_cogs === null && unitHpp !== null
    ? unitHpp * row.quantity
    : row.line_cogs === null ? null : Number(row.line_cogs);
  const lineGrossProfit = row.line_gross_profit === null && lineCogs !== null
    ? Number(row.line_revenue) - lineCogs
    : row.line_gross_profit === null ? null : Number(row.line_gross_profit);

  return { ...row, unit_hpp: unitHpp, line_cogs: lineCogs, line_gross_profit: lineGrossProfit };
}

export async function loadReportRows(supabase: SupabaseClient, from: string, to: string) {
  const range = makassarRange(from, to);
  const { data, error } = await supabase
    .from("sale_items")
    .select("id,sale_id,product_id,product_name_snapshot,sku_snapshot,variant_snapshot,size_ml_snapshot,quantity,unit_selling_price,unit_hpp,line_revenue,line_cogs,line_gross_profit,products(hpp),sales!inner(transaction_code,created_at,payment_method,status,profiles!sales_cashier_id_fkey(full_name))")
    .eq("sales.status", "completed")
    .gte("sales.created_at", range.start)
    .lte("sales.created_at", range.end)
    .order("created_at", { ascending: false, referencedTable: "sales" });
  if (error) throw error;
  return ((data ?? []) as unknown as ReportRow[]).map(withEffectiveHpp);
}

export function summarizeReportRows(rows: ReportRow[], from: string, to: string): ReportSummary {
  const revenue = rows.reduce((sum, row) => sum + Number(row.line_revenue), 0);
  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const hppComplete = rows.every((row) => row.line_cogs !== null);
  const cogs = hppComplete ? rows.reduce((sum, row) => sum + Number(row.line_cogs), 0) : null;
  const profit = cogs === null ? null : revenue - cogs;
  const transactions = new Set(rows.map((row) => row.sale_id)).size;
  const average = transactions ? revenue / transactions : 0;

  const ranked = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const row of rows) {
    const productKey = row.product_id ?? `deleted:${row.sku_snapshot}`;
    const current = ranked.get(productKey) ?? { name: row.product_name_snapshot, quantity: 0, revenue: 0 };
    current.quantity += row.quantity;
    current.revenue += Number(row.line_revenue);
    ranked.set(productKey, current);
  }
  const topProducts = [...ranked.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  const paymentCounts: Record<string, number> = {};
  const countedSales = new Set<string>();
  for (const row of rows) {
    if (countedSales.has(row.sale_id)) continue;
    countedSales.add(row.sale_id);
    const method = row.sales.payment_method ?? "other";
    paymentCounts[method] = (paymentCounts[method] ?? 0) + 1;
  }

  return { from, to, revenue, quantity, transactions, average, cogs, profit, topProducts, paymentCounts };
}
