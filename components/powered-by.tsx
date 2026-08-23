import Image from "next/image";
import { DEKAT_LOKAL_URL } from "@/lib/contact";

export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <a
      className={`powered-by-link ${className}`.trim()}
      href={DEKAT_LOKAL_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Powered by Dekat Lokal — buka situs Dekat Lokal"
    >
      <span>Powered by</span>
      <Image src="/dekat-lokal.png" width={118} height={30} alt="Dekat Lokal" />
    </a>
  );
}
