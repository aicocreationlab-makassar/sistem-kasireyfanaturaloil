import { ProductForm } from "@/components/product-form";
import { requireAdmin } from "@/lib/data";

export const metadata={title:"Tambah Produk"};
export default async function NewProductPage({searchParams}:{searchParams:Promise<{barcode?:string}>}){await requireAdmin();const {barcode=""}=await searchParams;return <main className="page"><div className="page-head"><div><p className="eyebrow">Produk baru</p><h1>Daftarkan produk</h1><p className="subtle">Data stok awal akan dicatat pada ledger inventori.</p></div></div><ProductForm prefillBarcode={barcode}/></main>}
