import { CashierPos } from "@/components/cashier-pos";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getCashierPageData } from "@/lib/data";

export const metadata = { title: "Kasir" };
export default async function CashierPage() {
  const { profile, products, todayRevenue } = await getCashierPageData();
  return <>
    <RealtimeRefresh tables={["products", "sales"]} />
    <CashierPos
      initialProducts={products}
      todayRevenue={todayRevenue}
      canRegister={profile.role !== "cashier"}
      cashierName={profile.full_name}
    />
  </>;
}
