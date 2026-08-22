import { InventoryManager } from "@/components/inventory-manager";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getMovements, getProducts, getSessionContext } from "@/lib/data";

export const metadata={title:"Inventori"};
export default async function InventoryPage(){const {profile}=await getSessionContext();const canManage=profile.role!=="cashier";const [products,movements]=await Promise.all([getProducts(),canManage?getMovements():Promise.resolve([])]);return <><RealtimeRefresh tables={["products"]}/><main className="page"><div className="page-head"><div><p className="eyebrow">Inventori</p><h1>Stok Produk</h1><p className="subtle">Semua perubahan tersimpan dalam ledger audit.</p></div></div><InventoryManager products={products} movements={movements} canManage={canManage}/></main></>}
