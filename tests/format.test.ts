import { describe, expect, it } from "vitest";
import { makassarRange, parseRupiahInput, rupiahDigits, stockStatus } from "@/lib/format";

describe("business rules",()=>{
  it("uses Makassar day boundaries",()=>{expect(makassarRange("2026-08-22","2026-08-22")).toEqual({start:"2026-08-22T00:00:00+08:00",end:"2026-08-22T23:59:59.999+08:00"})});
  it("labels stock states",()=>{expect(stockStatus(0,5).label).toBe("Habis");expect(stockStatus(5,5).label).toBe("Stok menipis");expect(stockStatus(6,5).label).toBe("Aman")});
  it("normalizes Indonesian Rupiah input",()=>{
    expect(rupiahDigits("Rp 055.000")).toBe("55000");
    expect(parseRupiahInput("Rp 1.250.000")).toBe(1_250_000);
  });
});
