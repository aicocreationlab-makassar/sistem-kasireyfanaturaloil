import { describe, expect, it } from "vitest";
import { csvCell, salesCsv } from "@/lib/csv";
import type { ReportRow } from "@/lib/types";

const row: ReportRow = {
  id:"i1",sale_id:"s1",product_id:"p1",product_name_snapshot:'Minyak, "Murni"',sku_snapshot:"EYFA-M-60",variant_snapshot:"Murni",size_ml_snapshot:60,quantity:2,unit_selling_price:55000,unit_hpp:null,line_revenue:110000,line_cogs:null,line_gross_profit:null,
  sales:{transaction_code:"EYFA-260822-000001",created_at:"2026-08-22T08:00:00Z",payment_method:"cash",status:"completed",profiles:{full_name:"Owner EYFA"}},
};

describe("CSV export",()=>{
  it("escapes commas, quotes, and newlines",()=>{expect(csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"')});
  it("adds Excel BOM and preserves missing HPP",()=>{const csv=salesCsv([row]);expect(csv.charCodeAt(0)).toBe(0xfeff);expect(csv).toContain('"Minyak, ""Murni"""');expect(csv).toContain("HPP belum diatur")});
  it("excludes voided rows",()=>{const csv=salesCsv([{...row,sales:{...row.sales,status:"voided"}}]);expect(csv).not.toContain("EYFA-260822-000001")});
});
