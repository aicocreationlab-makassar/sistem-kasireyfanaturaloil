"use client";
import { AlertTriangle } from "lucide-react";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="page"><div className="card card-pad empty"><AlertTriangle/><h2>Data belum dapat dimuat</h2><p>Periksa koneksi lalu coba kembali. Tidak ada transaksi yang dikonfirmasi tanpa respons database.</p><button className="btn btn-primary" onClick={reset}>Coba Lagi</button></div></main>}
