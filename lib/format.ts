export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

export const number = new Intl.NumberFormat("id-ID").format;

export function rupiahDigits(value: string | number | null | undefined, maxDigits = 12) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, maxDigits);
  return digits.replace(/^0+(?=\d)/, "");
}

export function parseRupiahInput(value: string | number | null | undefined) {
  const digits = rupiahDigits(value);
  return digits ? Number(digits) : 0;
}

const makassarDateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date) {
  return makassarDateTime.format(new Date(value));
}

export function localDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function makassarRange(from: string, to: string) {
  // Makassar is UTC+8 without daylight saving time.
  return { start: `${from}T00:00:00+08:00`, end: `${to}T23:59:59.999+08:00` };
}

export function stockStatus(stock: number, threshold: number) {
  if (stock === 0) return { label: "Habis", tone: "danger" as const };
  if (stock <= threshold) return { label: "Stok menipis", tone: "warning" as const };
  return { label: "Aman", tone: "success" as const };
}
