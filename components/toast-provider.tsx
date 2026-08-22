"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastInput, "duration">> {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput | string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { background: string; border: string; color: string }> = {
  success: { background: "#f0faf3", border: "#b9dfc5", color: "#1d6b3b" },
  error: { background: "#fff6f5", border: "#efc2be", color: "#a9322d" },
  info: { background: "#f5f8f6", border: "#d6ded8", color: "#285b3a" },
};

function ToastItem({ item, onDismiss }: { item: ToastRecord; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? AlertCircle : Info;
  const colors = toneStyles[item.tone];

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      style={{
        width: "min(100%, 390px)",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 12px 12px 14px",
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.background,
        color: colors.color,
        boxShadow: "0 14px 36px rgba(23, 33, 27, .16)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(.98)",
        transition: "opacity 180ms ease, transform 180ms ease",
        pointerEvents: "auto",
      }}
    >
      <Icon size={20} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 1 }} />
      <span style={{ minWidth: 0, flex: 1, fontSize: 13, lineHeight: 1.45, fontWeight: 700, overflowWrap: "anywhere" }}>
        {item.message}
      </span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Tutup notifikasi"
        style={{
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          margin: -4,
          border: 0,
          borderRadius: 8,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <X size={17} />
      </button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: { toasts: ToastRecord[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        zIndex: 120,
        top: "calc(12px + env(safe-area-inset-top))",
        right: 12,
        left: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((item) => <ToastItem key={item.id} item={item} onDismiss={onDismiss} />)}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput | string) => {
    const normalized = typeof input === "string" ? { message: input } : input;
    const id = ++nextId.current;
    const item: ToastRecord = {
      id,
      message: normalized.message,
      tone: normalized.tone ?? "info",
    };
    setToasts((current) => [...current.slice(-2), item]);
    const timer = setTimeout(() => dismiss(id), normalized.duration ?? 3200);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast harus digunakan di dalam ToastProvider");
  return value;
}
