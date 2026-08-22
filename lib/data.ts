import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { makassarRange, localDateISO } from "@/lib/format";
import type { Product, Profile, Sale, SaleItem, StockMovement } from "@/lib/types";

export const getSessionContext = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login?setup=1");
  }
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: claims.email ?? null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,role,is_active")
    .eq("id", user.id)
    .single();
  if (!profile?.is_active) redirect("/login?inactive=1");
  return { supabase, user, profile: profile as Profile };
});

export async function requireAdmin() {
  const context = await getSessionContext();
  if (context.profile.role === "cashier") redirect("/cashier");
  return context;
}

export async function getProducts(includeArchived = false) {
  const { supabase } = await getSessionContext();
  let query = supabase.from("products").select("*").order("variant").order("size_ml");
  if (!includeArchived) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Product[];
}

export async function getCashierPageData() {
  const { supabase, profile } = await getSessionContext();
  const today = localDateISO();
  const { start, end } = makassarRange(today, today);

  const [productsResult, salesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("variant")
      .order("size_ml"),
    supabase
      .from("sales")
      .select("total_amount")
      .eq("status", "completed")
      .gte("created_at", start)
      .lte("created_at", end),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (salesResult.error) throw salesResult.error;

  return {
    profile,
    products: (productsResult.data ?? []) as Product[],
    todayRevenue: (salesResult.data ?? []).reduce(
      (sum, sale) => sum + Number(sale.total_amount),
      0,
    ),
  };
}

export async function getSale(id: string) {
  const { supabase } = await getSessionContext();
  const [saleResult, itemsResult] = await Promise.all([
    supabase.from("sales").select("*,profiles!sales_cashier_id_fkey(full_name)").eq("id", id).single(),
    supabase.from("sale_items").select("*").eq("sale_id", id).order("created_at"),
  ]);
  if (saleResult.error) throw saleResult.error;
  if (itemsResult.error) throw itemsResult.error;
  return {
    sale: saleResult.data as unknown as Sale,
    items: (itemsResult.data ?? []) as SaleItem[],
  };
}

export async function getMovements(limit = 50) {
  const { supabase } = await getSessionContext();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id,product_id,movement_type,quantity_change,stock_before,stock_after,reference_note,created_at,products(name,size_ml),profiles!stock_movements_created_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as StockMovement[];
}

export async function getDashboardData() {
  const { supabase } = await getSessionContext();
  const today = new Date();
  const startDate = new Date(today.getTime() - 6 * 86400000);
  const from = localDateISO(startDate);
  const to = localDateISO(today);
  const range = makassarRange(from, to);
  const [salesResult, itemsResult, productsResult, recentResult] = await Promise.all([
    supabase
      .from("sales")
      .select("id,created_at,total_amount,total_cogs,gross_profit")
      .eq("status", "completed")
      .gte("created_at", range.start)
      .lte("created_at", range.end),
    supabase
      .from("sale_items")
      .select("product_id,product_name_snapshot,quantity,sales!inner(status,created_at)")
      .eq("sales.status", "completed")
      .gte("sales.created_at", range.start)
      .lte("sales.created_at", range.end),
    supabase
      .from("products")
      .select("id,name,stock_quantity,low_stock_threshold")
      .eq("is_active", true),
    supabase
      .from("sales")
      .select("id,transaction_code,created_at,total_amount,profiles!sales_cashier_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (salesResult.error) throw salesResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (productsResult.error) throw productsResult.error;
  if (recentResult.error) throw recentResult.error;

  const sales = salesResult.data ?? [];
  const items = itemsResult.data ?? [];
  const products = productsResult.data ?? [];
  const recent = (recentResult.data ?? []) as unknown as Sale[];
  const todaySales = sales.filter((sale) => localDateISO(new Date(sale.created_at)) === to);
  const summary = {
    revenue: todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0),
    cogs: todaySales.every((sale) => sale.total_cogs !== null)
      ? todaySales.reduce((sum, sale) => sum + Number(sale.total_cogs), 0)
      : null,
    profit: todaySales.every((sale) => sale.gross_profit !== null)
      ? todaySales.reduce((sum, sale) => sum + Number(sale.gross_profit), 0)
      : null,
    transactions: todaySales.length,
    stock: products.reduce((sum, product) => sum + product.stock_quantity, 0),
  };

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate.getTime() + index * 86400000);
    const key = localDateISO(date);
    const revenue = sales.filter((sale) => localDateISO(new Date(sale.created_at)) === key).reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    return { date: key, label: new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Makassar" }).format(date), revenue };
  });
  const ranked = new Map<string, { name: string; quantity: number }>();
  for (const item of items) {
    const entry = ranked.get(item.product_id) ?? { name: item.product_name_snapshot, quantity: 0 };
    entry.quantity += item.quantity; ranked.set(item.product_id, entry);
  }
  const best = [...ranked.values()].sort((a, b) => b.quantity - a.quantity)[0] ?? null;
  return {
    summary,
    trend,
    best,
    lowStock: products
      .filter((product) => product.stock_quantity <= product.low_stock_threshold)
      .sort((a, b) => a.stock_quantity - b.stock_quantity),
    recent,
  };
}
