import { CashierPos } from "@/components/cashier-pos";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getProducts, getSessionContext, getTodaySummary } from "@/lib/data";

export const metadata = { title: "Kasir" };
export default async function CashierPage() {
  const [{ profile }, products, summary] = await Promise.all([getSessionContext(), getProducts(), getTodaySummary()]);
  return <><RealtimeRefresh tables={["products", "sales"]} /><CashierPos initialProducts={products} todayRevenue={summary.revenue} canRegister={profile.role !== "cashier"} /></>;
}
