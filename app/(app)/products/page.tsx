import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getProducts, getSessionContext } from "@/lib/data";
import { rupiah, stockStatus } from "@/lib/format";

export const metadata={title:"Produk"};
export default async function ProductsPage(){
  const [{profile},products]=await Promise.all([getSessionContext(),getProducts(true)]); const admin=profile.role!=="cashier";
  return <main className="page"><div className="page-head"><div><p className="eyebrow">Katalog</p><h1>Produk</h1><p className="subtle">{products.filter(p=>p.is_active).length} aktif · {products.filter(p=>!p.is_active).length} diarsipkan</p></div>{admin&&<Link href="/products/new" className="btn btn-primary"><Plus size={18}/> Tambah</Link>}</div>
    <div className="grid product-grid">{products.map((product)=>{const status=stockStatus(product.stock_quantity,product.low_stock_threshold);const content=<><div className="product-img" style={{opacity:product.is_active?1:.55}}><Image src={product.image_url||"/logo-eyfa.png"} alt={product.name} fill sizes="(max-width:680px) 50vw, 240px"/></div><div className="product-info"><div style={{display:"flex",gap:6,marginBottom:7}}>{!product.is_active&&<span className="badge muted">Diarsipkan</span>}<span className={`badge ${status.tone}`}>{status.label}</span></div><h3>{product.name}</h3><div className="product-price">{rupiah(product.selling_price)}</div><div className="stock-row"><span>{product.sku}</span><strong>Stok {product.stock_quantity}</strong></div>{admin&&<div className="tiny" style={{marginTop:7}}>{product.hpp===null?"HPP belum diatur":`HPP ${rupiah(product.hpp)}`}</div>}</div></>;return admin?<Link className="product-card card" href={`/products/${product.id}`} key={product.id}>{content}</Link>:<article className="product-card card" key={product.id}>{content}</article>})}</div>
  </main>;
}
