"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ViewportPortal } from "@/components/viewport-portal";

interface BarcodeResult { rawValue: string; format?: string }
interface Detector { detect(source: HTMLVideoElement): Promise<BarcodeResult[]> }
interface DetectorConstructor {
  new(options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
}

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (value: string, format: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resolved = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    let stopFallback: (() => void) | undefined;
    const done = (value: string, format = "custom") => {
      if (resolved.current || !value) return;
      resolved.current = true;
      if (navigator.vibrate) navigator.vibrate(80);
      onDetected(value, format.toLowerCase().replace("_", ""));
    };
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = videoRef.current;
        if (!video || stopped) { stream.getTracks().forEach((track) => track.stop()); return; }
        video.srcObject = stream; await video.play();
        const NativeDetector = (window as typeof window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (NativeDetector) {
          const detector = new NativeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128"] });
          const tick = async () => {
            if (stopped || resolved.current) return;
            try { const codes = await detector.detect(video); if (codes[0]) return done(codes[0].rawValue, codes[0].format); } catch { /* transient video frame */ }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) done(result.getText(), result.getBarcodeFormat().toString());
          });
          stopFallback = () => controls.stop();
        }
      } catch {
        setError("Kamera belum dapat diakses. Izinkan akses kamera atau pilih produk secara manual.");
      }
    }
    start();
    return () => { stopped = true; stopFallback?.(); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onClose, onDetected]);

  return <ViewportPortal><div className="scanner" role="dialog" aria-modal="true" aria-label="Pemindai barcode">
    <div className="scanner-head"><strong>Scan produk</strong><button className="btn icon-btn" style={{color:"white"}} onClick={onClose} aria-label="Tutup pemindai"><X /></button></div>
    <div className="scanner-stage"><video ref={videoRef} muted playsInline aria-label="Pratinjau kamera" /><div className="scan-frame" />{error && <div className="error" style={{position:"absolute",margin:20}}>{error}</div>}</div>
    <div className="scanner-help">Arahkan barcode atau QR produk ke dalam bingkai. Pemindaian berlangsung otomatis.</div>
  </div></ViewportPortal>;
}
