import { notFound } from "next/navigation";
import { ProductArchiveAction } from "@/components/product-actions";
import { ProductForm } from "@/components/product-form";
import { requireAdmin } from "@/lib/data";
import type { Product } from "@/lib/types";

export const metadata={title:"Detail Produk"};
export default async function ProductDetailPage({params}:{params:Promise<{id:string}>}){const {supabase}=await requireAdmin();const {id}=await params;const {data}=await supabase.from("products").select("*").eq("id",id).single();if(!data)notFound();const product=data as Product;return <main className="page"><div className="page-head"><div><p className="eyebrow">Detail Produk</p><h1>{product.name}</h1><p className="subtle">Perubahan harga dan HPP hanya berlaku untuk transaksi berikutnya.</p></div><ProductArchiveAction id={id} active={product.is_active}/></div><ProductForm product={product}/></main>}
