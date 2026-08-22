# MASTER CODEX PROMPT
# EYFA Natural Oil — Mobile POS, Inventory, HPP & Business Reporting System
## Production-Ready Next.js + Supabase

**Business:** EYFA Natural Oil  
**System Type:** Mobile-first POS + Inventory + HPP + Sales Reporting  
**Primary Users:** Owner / Admin / Cashier  
**Primary Device:** Smartphone  
**Design Reference:** https://eyfa.dekatlokal.com  
**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Auth, Supabase Realtime  
**Primary Goal:** Sangat cepat, ringan, realtime, dan mudah digunakan setiap hari oleh UMKM.

---

# 0. IMPORTANT — READ FIRST

Implement a **production-ready system**, not a mockup.

Before coding:

1. Audit the existing repository.
2. Inspect `package.json`, Next.js version, React version, TypeScript config, Tailwind config, existing UI components, existing `/public` assets, product image folders, Supabase configuration, environment variable conventions, lint/test tooling.
3. Run the project and understand the current architecture.
4. Reuse existing working components and utilities.
5. Do not rewrite a working project unnecessarily.
6. Do not use a heavy framework or library if native browser APIs or small utilities can solve the same problem.
7. Prioritize correctness, speed, maintainability, and minimal bundle size.
8. The system MUST work well on low-to-mid-range Android phones and mobile Safari.
9. Mobile-first is mandatory.
10. Do not create fake product images. Use real EYFA product images already available in the project folder according to product names.
11. Use the visual language of `https://eyfa.dekatlokal.com` so this internal system still feels like EYFA.
12. Do not add unnecessary AI features.
13. Do not add ecommerce/payment gateway.
14. Do not over-engineer.
15. Write concise, reusable code. If the same result can be implemented correctly in 100 lines instead of 1000, choose the simpler implementation.
16. Avoid duplicated code and huge monolithic components.
17. No `any` for core domain types.
18. No client-side trust for stock, HPP, sales, or profit calculations.
19. Database is the source of truth.
20. Every core transaction must be atomic and safe from double submission.
21. Run build, lint, typecheck, tests, and manual UAT before declaring complete.

---

# 1. BUSINESS PROBLEM

EYFA Natural Oil currently has operational friction around:

- sales recording that is still manual
- stock recording that can be forgotten
- data that can be lost
- HPP calculation that is not immediately visible
- daily sales reporting that is not automatically generated
- difficulty understanding omzet and estimated profit quickly
- repetitive manual input

The system should simplify the workflow into:

# **Select Product → Input Quantity → Save Transaction → Stock Automatically Decreases → Daily Report Updates**

The owner should be able to understand:

- omzet
- stock
- HPP
- estimated gross profit
- sales today
- sales history
- low stock
- best-selling products

---

# 2. PRODUCT PRINCIPLE

The product should feel like a **simple mobile cashier**, not an enterprise ERP.

The most important rule:

> **The owner must be able to record a sale in only a few taps.**

Target daily flow:

```text
Open App
→ Scan Product or Tap Product
→ Set Quantity
→ Confirm Sale
→ Done
```

Target transaction completion:
**less than 10 seconds for a normal sale after the app is loaded.**

---

# 3. REQUIRED CORE FEATURES

MVP / production scope MUST include:

1. Product selection
2. Quantity input
3. Save transaction
4. Automatic stock deduction
5. Automatic daily sales reporting
6. QR/barcode product scanning
7. Product registration
8. Barcode registration via camera
9. Auto-generated QR code
10. Stock management
11. HPP management
12. Revenue/omzet calculation
13. Estimated gross profit
14. Daily / weekly / monthly reporting
15. Sales history
16. Inventory movement history
17. Low stock indicator
18. CSV export
19. Realtime synchronization
20. Responsive mobile-first UI
21. Supabase Auth
22. Role-based access
23. Audit-safe transaction logic
24. Product soft delete / archive
25. Dashboard

---

# 4. USER ROLES

## Owner / Admin

Can:

- see all data
- create product
- edit product
- archive/delete product safely
- change selling price
- change HPP
- add stock
- correct stock through adjustment
- scan/register barcode
- generate QR
- record sales
- view reports
- export CSV
- view profit
- view transaction history
- manage cashier users if needed

## Cashier

Can:

- login
- scan/select product
- create transaction
- view current product stock
- see today's sales summary
- view own recent transactions

Cashier cannot:

- modify HPP
- delete products
- directly edit stock
- delete sales
- change roles
- access sensitive settings

For first production version, Owner/Admin is mandatory. Cashier role may still be implemented because it is lightweight and makes the architecture production-ready.

---

# 5. SEED PRODUCTS

Create actual seed data in Supabase migrations or seed script.

Use these six products exactly:

## 1. Minyak Kemiri Hitam 60 ml
Selling Price: **Rp55.000**

## 2. Minyak Kemiri Bakar 60 ml
Selling Price: **Rp55.000**

## 3. Minyak Kemiri Murni 60 ml
Selling Price: **Rp55.000**

## 4. Minyak Kemiri Bakar 100 ml
Selling Price: **Rp70.000**

## 5. Minyak Kemiri Murni 100 ml
Selling Price: **Rp70.000**

## 6. Minyak Kemiri Hitam 100 ml
Selling Price: **Rp70.000**

Important:

- The prompt does NOT provide actual HPP/unit cost.
- Do NOT invent HPP.
- Store `hpp` as nullable or require owner setup before profit can be finalized.
- Dashboard should clearly show when a product does not yet have HPP.
- Estimated profit must only use products with valid HPP.
- If HPP is missing, label related profit data as `HPP belum diatur`, not zero profit.

Use real product images already in the project folder.

Match images by:
- variant name
- size if available
- filename similarity

If one image is used for both sizes of the same variant, reuse the correct real image instead of generating new assets.

---

# 6. PRODUCT MODEL

Each product should have:

```text
id
name
variant
size_ml
sku
barcode_value
barcode_type
selling_price
hpp
stock_quantity
low_stock_threshold
image_url
is_active
created_at
updated_at
```

Suggested variants:

```text
Murni
Bakar
Hitam
```

Sizes:

```text
60
100
```

Barcode type can be:

```text
qr
ean13
code128
custom
```

Do not require a standard EAN if EYFA does not already have one.

The system should support internal QR codes.

---

# 7. PRODUCT REGISTRATION

Admin route:

```text
/products/new
```

Form fields:

- Product Name
- Variant
- Size
- SKU
- Selling Price
- HPP
- Initial Stock
- Low Stock Threshold
- Product Image
- Barcode / QR

Actions:

### Option A — Scan Existing Barcode

Button:

**Scan Barcode**

Open camera.

When barcode is detected:
- immediately populate `barcode_value`
- close scanner
- show success feedback
- prevent duplicate barcode

### Option B — Generate Internal QR

Button:

**Generate QR**

Generate unique product code.

Recommended value:

```text
EYFA-{SKU-or-UUID}
```

Store the raw value in database.

Generate QR visually only when needed.

Do not store huge base64 QR image in database.

Generate QR from text dynamically.

---

# 8. CAMERA BARCODE SCANNER

Scanning must work from smartphone camera.

Priority implementation:

## First Choice

Use native `BarcodeDetector` API when available.

This reduces bundle size and is very fast.

## Fallback

Use a lightweight fallback such as:

```text
@zxing/browser
```

ONLY load the fallback dynamically when scanning is opened and native BarcodeDetector is unavailable.

Do not bundle the scanner library into the initial dashboard JS if it can be lazy-loaded.

Support common formats:

- QR_CODE
- EAN_13
- EAN_8
- CODE_128

Camera UX:

1. Tap `Scan`
2. Ask camera permission only when needed
3. Use rear camera
4. Show scanner overlay
5. Detect code
6. Give vibration feedback if supported
7. Immediately resolve product
8. Close camera
9. Open product quantity sheet

If barcode is unknown:

Show:

> Produk belum terdaftar.

Actions:

- **Daftarkan Produk**
- **Scan Ulang**

If admin chooses `Daftarkan Produk`, prefill the scanned barcode into new product form.

---

# 9. QR CODE GENERATION

Every product can have an internal QR code.

Admin actions:

- Preview QR
- Download QR PNG or SVG
- Print label
- Copy code

Do not make QR contain secret database identifiers if unnecessary.

Use public/random product code.

QR resolution should be suitable for printing product labels.

---

# 10. POS / CASHIER HOME

Primary route:

```text
/cashier
```

Mobile-first.

This should be the fastest screen in the application.

Header:

- EYFA logo
- current user
- today sales compact indicator
- online/realtime status if useful

Main actions:

# **Scan Produk**

large primary CTA.

Then:

## Quick Product Grid

Display six products as fast tappable cards:

- product image
- short name
- size
- selling price
- stock

No huge decorative cards.

Use compact 2-column mobile grid.

Allow search.

---

# 11. PRODUCT SELECTION FLOW

Two ways:

### Scan
`Scan → Product Found → Quantity`

### Manual
`Tap Product → Quantity`

Use bottom sheet.

Example:

```text
Minyak Kemiri Murni 60 ml
Rp55.000
Stock: 14

Quantity
[-] 2 [+]

Subtotal
Rp110.000

[Tambah ke Transaksi]
```

For simplest workflow, the system should support a small cart so customer can buy multiple variants in one transaction.

---

# 12. CART

Cart must support:

- multiple products
- quantity increment
- quantity decrement
- remove item
- subtotal
- total items
- total amount

Do NOT allow quantity above available stock.

Fast checkout CTA:

# **Simpan Transaksi**

No payment gateway required.

Optional simple payment method:

- Cash
- Transfer
- QRIS
- Other

If payment method is added, keep it lightweight.

---

# 13. SALES TRANSACTION

When user clicks `Simpan Transaksi`, server must atomically:

1. verify authenticated user
2. verify all products exist
3. verify all products active
4. lock relevant stock rows
5. verify stock is sufficient
6. create sale header
7. create sale items
8. snapshot selling price
9. snapshot HPP at transaction time
10. reduce stock
11. create stock movement records
12. commit transaction
13. return completed sale

Do not:

- create sale client-side
- update stock separately from sale
- trust subtotal sent by browser
- trust profit sent by browser

Recommended PostgreSQL RPC:

```text
create_sale(p_items jsonb, p_payment_method text, p_note text)
```

The database must calculate totals from authoritative product values.

---

# 14. PRICE & HPP SNAPSHOT

Sale item must store:

```text
unit_selling_price
unit_hpp
quantity
line_revenue
line_cogs
line_gross_profit
```

Reason:

If product selling price or HPP changes later, historical reports MUST NOT change.

This is critical for financial accuracy.

---

# 15. HPP / COGS

HPP means cost per unit.

Admin can update HPP from product detail.

Current HPP should affect only future sales.

Historical transactions retain the HPP snapshot at sale time.

Calculations:

```text
Revenue = selling price × quantity
COGS/HPP Total = unit HPP × quantity
Estimated Gross Profit = Revenue - COGS
Gross Margin % = Gross Profit / Revenue × 100
```

Important wording:

Use **Estimasi Laba Kotor** or **Estimated Gross Profit**, not net profit.

Do not call it net profit because operating expenses are not part of this MVP unless explicitly implemented.

---

# 16. STOCK MANAGEMENT

Admin route:

```text
/inventory
```

Display:

- product
- stock now
- low stock threshold
- stock status

Actions:

- Add Stock
- Stock Adjustment
- View History

Never allow direct arbitrary editing of stock quantity without movement history.

---

# 17. ADD STOCK

Admin:

```text
Select Product
→ Add Quantity
→ Optional Supplier/Source
→ Optional Unit Cost
→ Note
→ Save
```

Create stock movement:

```text
type = stock_in
quantity = positive
```

If unit cost is supplied and owner chooses to update HPP:
- provide explicit toggle
- do not silently change HPP

---

# 18. STOCK ADJUSTMENT

For discrepancies:

```text
Adjustment +
Adjustment -
```

Require reason.

Examples:
- damaged product
- stock count correction
- sample/giveaway
- lost product
- initial migration

Every movement must be auditable.

---

# 19. STOCK MOVEMENT LEDGER

Table:

```text
stock_movements
```

Fields:

```text
id
product_id
movement_type
quantity_change
stock_before
stock_after
sale_id nullable
reference_note
created_by
created_at
```

Movement types:

```text
sale
stock_in
adjustment_in
adjustment_out
return
initial
```

---

# 20. PRODUCT ARCHIVE / DELETE

User asked products can be deleted.

Implement safe behavior.

If product has transaction history:

DO NOT hard-delete.

Use:

```text
is_active = false
```

UI label:

**Arsipkan Produk**

Archived products:
- disappear from cashier
- remain in historical reports

If product has never been used anywhere, hard-delete may be allowed.

But default production behavior should be soft delete/archive.

---

# 21. DAILY SALES REPORT

Every completed sale automatically appears in daily report.

No manual report input.

Daily metrics:

- Omzet Hari Ini
- Jumlah Transaksi
- Produk Terjual
- Total HPP
- Estimasi Laba Kotor
- Average Transaction Value

Formula:

```text
Omzet = SUM(line_revenue)
HPP = SUM(line_cogs)
Gross Profit = SUM(line_gross_profit)
```

Use database aggregation or efficient server queries.

---

# 22. DASHBOARD

Route:

```text
/dashboard
```

Mobile-first.

Top cards:

## Omzet Hari Ini

## Estimasi Laba Kotor

## Transaksi Hari Ini

## Total Stock Units

Then:

### Sales Trend
Daily trend

### Best-Selling Product

### Low Stock

### Recent Transactions

Do not overload dashboard.

No heavy analytics library unless necessary.

For charts:

Use lightweight chart implementation.

If existing chart library is already installed, reuse.

If not, use a light option and lazy-load charts.

Charts are not needed for the first meaningful paint.

---

# 23. REPORTS

Route:

```text
/reports
```

Filters:

- Today
- Yesterday
- Last 7 Days
- This Month
- Custom Date

Metrics:

- omzet
- transaction count
- quantity sold
- HPP total
- estimated gross profit
- gross margin
- best seller

Reports should be derived from sales data.

Do not maintain a separate mutable daily report table unless there is a clear performance reason.

---

# 24. SALES HISTORY

Route:

```text
/sales
```

List:

- transaction code
- date/time
- items
- total
- payment method
- cashier

Tap:

```text
/sales/[id]
```

Detail:

- products
- quantities
- unit price
- HPP
- subtotal
- total
- estimated gross profit

Do not allow deletion of normal completed sales.

If correction is needed later, use void/cancel transaction with audit trail.

---

# 25. VOID / CORRECTION

For production accuracy, owner/admin should be able to void an incorrect transaction.

Do not hard delete.

Void operation must:

1. verify admin
2. lock sale
3. ensure not already void
4. reverse stock
5. add stock movements
6. mark sale `voided`
7. store reason
8. preserve original record

Reports exclude voided sales from active totals.

---

# 26. CSV EXPORT

Must support CSV download.

Reports page:

**Download CSV**

Export:

- date/time
- transaction code
- product
- variant
- size
- quantity
- selling price
- omzet
- HPP/unit
- total HPP
- gross profit
- payment method
- cashier

Allow date filter.

Do not add heavy Excel dependency only to generate CSV.

Generate UTF-8 CSV with BOM if needed for Excel compatibility.

Correctly escape comma, quotes, and newline.

Suggested filename:

```text
eyfa-penjualan-YYYY-MM-DD-to-YYYY-MM-DD.csv
```

---

# 27. REALTIME — MANDATORY

Realtime is REQUIRED.

Use Supabase Realtime selectively.

Realtime updates:

- stock changes
- new sales
- product updates
- low stock
- dashboard summary refresh

Example:

Cashier A sells product.

Cashier B or Owner dashboard should see updated stock/sales without manual refresh.

Important performance rule:

Do NOT subscribe to every table globally.

Subscribe only to relevant store/product changes and current sales scope where needed.

On realtime event:
- invalidate/refetch relevant lightweight query
OR
- update local cache safely

Database remains authoritative.

---

# 28. REALTIME PERFORMANCE

Recommended:

- Server Components for initial data
- Client Components only for interactive/realtime areas
- One subscription per logical screen, not per card
- Unsubscribe on unmount
- Avoid huge realtime payloads
- Fetch only changed summary when possible

No full-page reload after realtime event.

---

# 29. PERFORMANCE IS A HARD REQUIREMENT

The app MUST feel instant.

Performance requirements:

- mobile-first
- minimal JS
- minimal dependencies
- no unnecessary animations
- no large hero assets in operational screens
- images optimized
- scanner lazy-loaded
- charts lazy-loaded
- list pagination when needed
- database indexes
- efficient SQL
- no N+1 queries
- no repeated Supabase client creation
- no fetching all history for dashboard

Use Next.js Server Components by default.

Only use `'use client'` where interaction requires it.

Avoid turning entire pages into client components.

---

# 30. CODE EFFICIENCY REQUIREMENT

Codex must actively minimize code complexity.

Rules:

1. Do not duplicate business logic.
2. Core calculation logic belongs in database/server domain layer.
3. Create reusable small components.
4. Avoid one file with 1000+ lines.
5. Avoid unnecessary abstractions.
6. Avoid unnecessary design system frameworks.
7. Avoid Redux/Zustand unless actually necessary.
8. Prefer local component state for small UI.
9. Avoid React Query if native Next.js/revalidation/realtime architecture is sufficient.
10. If a data cache library already exists in repo, reuse it rather than introducing another.
11. Do not install 10 libraries to solve 3 features.
12. Before adding a dependency, ask internally:
   - can browser API solve it?
   - can a small utility solve it?
   - is the dependency already present?

Goal:

> **minimum code that remains clear, safe, typed, tested, and maintainable.**

Never sacrifice correctness only to reduce line count.

---

# 31. IMAGE PERFORMANCE

Product images are already in the project.

Use `next/image`.

Requirements:

- correct sizes
- optimized dimensions
- avoid loading all full-resolution images
- thumbnails for product grid
- lazy loading outside viewport
- priority only for essential top-screen image if any

Cashier screen should not wait for product images to become usable.

---

# 32. DESIGN DIRECTION

Reference:

https://eyfa.dekatlokal.com

EYFA public site communicates:
- natural
- clean
- warm
- hygienic
- premium but approachable
- product-first

Internal system should inherit the same brand feeling without copying the marketing layout.

Do not make internal POS look like a landing page.

Design:

- clean surfaces
- compact cards
- clear typography
- brand accent derived from EYFA site
- strong contrast
- large mobile tap targets
- minimal shadows
- minimal gradients
- fast visual hierarchy

Avoid:
- glassmorphism
- excessive blur
- giant cards
- animated decorative backgrounds
- generic SaaS template look
- excessive icons

---

# 33. MOBILE-FIRST UX

Primary tested widths:

```text
320
360
375
390
412
430
```

Also:

```text
768
1024
1440
```

Mobile navigation recommended:

- Kasir
- Stok
- Laporan
- Produk
- Menu/Profile

Keep `Kasir` easiest to reach.

---

# 34. AUTH

Use Supabase Auth.

Routes:

```text
/login
/forgot-password
```

No public business signup needed.

Admin accounts are created manually/seeded securely.

Protect all operational routes.

Use SSR-friendly Supabase auth.

Do not expose service role key to browser.

---

# 35. DATABASE TABLES

Recommended schema.

## profiles

```text
id uuid PK references auth.users
full_name text
role text
is_active boolean
created_at
updated_at
```

Roles:

```text
owner
admin
cashier
```

## products

```text
id uuid PK
name text
variant text
size_ml integer
sku text unique
barcode_value text unique nullable
barcode_type text nullable
selling_price numeric(14,2)
hpp numeric(14,2) nullable
stock_quantity integer
low_stock_threshold integer
image_url text
is_active boolean
created_at
updated_at
```

Constraints:
- selling_price >= 0
- hpp >= 0 if not null
- stock_quantity >= 0
- size_ml > 0

## sales

```text
id uuid PK
transaction_code text unique
cashier_id uuid
payment_method text nullable
subtotal numeric
total_amount numeric
total_cogs numeric
gross_profit numeric
status text
note text nullable
void_reason text nullable
voided_by uuid nullable
voided_at timestamptz nullable
created_at timestamptz
```

Status:

```text
completed
voided
```

## sale_items

```text
id uuid PK
sale_id uuid FK
product_id uuid FK
product_name_snapshot text
sku_snapshot text
quantity integer
unit_selling_price numeric
unit_hpp numeric nullable
line_revenue numeric
line_cogs numeric nullable
line_gross_profit numeric nullable
created_at
```

Historical snapshot fields are mandatory.

## stock_movements

```text
id uuid PK
product_id uuid FK
movement_type text
quantity_change integer
stock_before integer
stock_after integer
sale_id uuid nullable
reference_note text nullable
created_by uuid
created_at
```

---

# 36. INDEXES

Create useful indexes:

```text
products(barcode_value)
products(sku)
products(is_active)
sales(created_at)
sales(status, created_at)
sale_items(sale_id)
sale_items(product_id)
stock_movements(product_id, created_at)
```

Use indexes based on actual query patterns.

---

# 37. RLS & SECURITY

Enable RLS.

Cashier can:
- read active products
- create sale only through secure RPC
- read own/relevant sales based on policy
- not edit HPP
- not change stock directly

Owner/Admin can:
- manage products
- manage HPP
- add/adjust stock
- view reports
- void transactions

Critical:

Browser must NEVER be able to:

```text
UPDATE products.stock_quantity directly
INSERT fake sale totals
UPDATE sale totals
DELETE sale
UPDATE role
```

Use RPCs/security definer functions carefully.

Validate actor role inside server/database.

---

# 38. RECOMMENDED DATABASE FUNCTIONS

## create_sale

Atomic transaction.

Inputs:

```text
items JSONB
payment_method
note
```

Returns:

```text
sale_id
transaction_code
total
```

## add_stock

Atomic stock addition.

## adjust_stock

Admin-only.

## void_sale

Admin-only and reverses inventory.

These functions should be small and documented.

---

# 39. TRANSACTION CODE

Generate readable unique code.

Example:

```text
EYFA-260822-0001
```

Must be concurrency-safe.

Do not generate duplicate codes with fragile client counting.

Use date + sequence or UUID-backed strategy.

---

# 40. CURRENCY

All display uses Indonesian Rupiah.

Use `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.

Store numeric values in database.

Never store:

```text
"Rp55.000"
```

as database price text.

Store:

```text
55000
```

---

# 41. DATE/TIME

Use timezone-aware timestamps.

Business display timezone:
**Asia/Makassar**

Do not group daily report by UTC midnight.

Daily report must reflect Makassar local day.

---

# 42. PWA / INSTALLABILITY

Optional but recommended ONLY if lightweight.

If repo already supports it, make the app installable.

Do not add a heavy PWA dependency if it complicates build.

Priority remains speed, reliability, and mobile browser usability.

---

# 43. OFFLINE BEHAVIOR

Full offline transaction support is NOT required.

However:

- show clear network error
- do not falsely confirm transaction if request did not reach server
- preserve cart in local state temporarily
- allow retry
- prevent duplicate transaction on retry

---

# 44. OPTIMISTIC UX

You may use optimistic UI for non-critical visual interactions.

Do NOT optimistically show a sale as successfully committed before database confirms it.

For financial/stock operations:

- show processing
- await server success
- then show completion

---

# 45. LOADING UX

Cashier home:

- product skeleton if needed
- scanner loads only when opened
- no blocking dashboard analytics

Buttons:
- disable while mutation pending
- prevent double clicks

After transaction:

Show:

# **Transaksi berhasil**

Details:
- transaction code
- total
- stock updated

CTA:
- **Transaksi Baru**
- **Lihat Detail**

---

# 46. LOW STOCK

Each product has threshold.

Default seed threshold can be:

```text
5
```

This is a UI operational default, not a business claim.

Admin can change threshold.

Show:

- Aman
- Stok Menipis
- Habis

Do not allow sale when stock = 0.

---

# 47. HPP MISSING STATE

Because actual HPP was not provided:

Product card/detail should show:

> **HPP belum diatur**

Admin dashboard may show:

> Lengkapi HPP agar estimasi laba dapat dihitung akurat.

When one or more sale items have no HPP:

- revenue still calculated
- do not fabricate gross profit
- indicate profit calculation is incomplete

---

# 48. REPORT ACCURACY

Financial reporting must follow sale snapshots.

Never recalculate historical sale revenue from current product price.

Never recalculate historical HPP from current HPP.

This is production-critical.

---

# 49. DATA EXPORT

CSV export should be generated from filtered authoritative query.

Do not export hidden/private auth data.

Allow:
- daily
- weekly
- monthly
- custom period

---

# 50. ROUTE STRUCTURE

Suggested:

```text
/
├── login
├── dashboard
├── cashier
├── products
│   ├── page
│   ├── new
│   └── [id]
├── inventory
├── sales
│   └── [id]
├── reports
├── scanner
└── settings
```

Scanner can also be modal/sheet rather than separate route.

Follow existing app architecture if cleaner.

---

# 51. PRODUCT SEARCH

Search should be instant locally on loaded active product list.

Search:
- product name
- variant
- size
- SKU
- barcode

For only a handful of products, do not make unnecessary server request per keystroke.

---

# 52. SEED PRODUCT IMAGE MAPPING

Find existing files by names similar to:

```text
kemiri murni
kemiri bakar
kemiri hitam
eyfa
60ml
100ml
```

Use real asset paths.

If no exact 100 ml image exists, use the real variant image and distinguish size through UI text.

Do not generate fake images.

---

# 53. AUDITABILITY

All financial/inventory mutations should record:

- who
- when
- what changed
- reference

This protects the owner from silent data changes.

---

# 54. TESTING REQUIREMENTS

Use existing test framework.

At minimum test:

## Sale
- single product sale
- multiple product sale
- quantity > 1
- insufficient stock
- stock decreases
- report updates
- HPP snapshot
- current price changes do not alter old sale
- current HPP changes do not alter old sale
- double click does not duplicate sale

## Stock
- add stock
- adjustment
- cannot go negative
- movement history created

## Barcode
- known barcode resolves product
- unknown barcode opens registration option
- duplicate barcode rejected

## Void
- stock restored exactly once
- sale excluded from active totals
- double void rejected

## Security
- cashier cannot change HPP
- cashier cannot direct-update stock
- browser cannot fake totals
- unauthorized user cannot access system

---

# 55. MANUAL UAT — MOBILE

## Cashier Flow

1. Login
2. Scan product
3. Product opens
4. Add quantity
5. Add second product
6. Save transaction
7. Confirm stock decreased
8. Confirm daily omzet increased
9. Confirm report entry exists

## Product Flow

1. Add product
2. Scan barcode through camera
3. Save
4. Scan again
5. Product opens
6. Generate/download QR

## Inventory

1. Add stock
2. Confirm stock increases realtime
3. Check movement history

## Reports

1. Open today report
2. Check totals
3. Export CSV
4. Open CSV in spreadsheet software

---

# 56. PERFORMANCE QA

Inspect:

- initial JS bundle
- scanner chunk
- unnecessary dependencies
- duplicate network requests
- image sizes
- Supabase query count
- console warnings

Goals:

- operational screen becomes interactive quickly
- cashier flow feels immediate
- no noticeable delay after simple product tap
- realtime refresh without page reload
- no giant JS bundle due to scanner/chart library

---

# 57. ACCESSIBILITY

- minimum comfortable touch targets
- labels
- focus states
- camera permission explanation
- readable font size
- contrast
- status not represented only by color
- buttons reachable one-handed

---

# 58. ERROR MESSAGES

### Insufficient Stock
> Stok Minyak Kemiri Murni 60 ml tersisa 1. Kurangi jumlah pembelian.

### Network
> Transaksi belum tersimpan karena koneksi terputus. Coba lagi.

### Duplicate Barcode
> Barcode ini sudah digunakan oleh produk lain.

### Camera
> Kamera belum dapat diakses. Izinkan akses kamera atau pilih produk secara manual.

---

# 59. DO NOT BUILD

Do NOT add:

- payment gateway
- ecommerce
- customer loyalty
- WhatsApp blast
- accounting journal
- payroll
- supplier ERP
- AI chatbot
- unnecessary CRM
- multi-warehouse
- multi-tenant SaaS

unless explicitly requested later.

---

# 60. DEFINITION OF DONE

System is complete only when:

```text
Owner logs in
→ scans or selects product
→ adds quantity
→ saves transaction
→ database commits sale
→ stock decreases atomically
→ stock movement recorded
→ daily omzet updates
→ HPP snapshot is retained
→ estimated gross profit updates when HPP exists
→ another active session receives realtime update
→ CSV can be downloaded
```

Also:

```text
Admin can add a product
→ scan its barcode via camera
→ save barcode
→ generate QR
→ scan QR/barcode later
→ product immediately opens
```

---

# 61. FINAL QA CHECKLIST

Before finishing:

1. All 6 products seeded.
2. Selling prices correct.
3. HPP not fabricated.
4. Product images use actual EYFA files.
5. Product scanner works on mobile.
6. Native BarcodeDetector used where supported.
7. Fallback lazy-loaded.
8. QR generation works.
9. Product scan resolves immediately.
10. Cart works.
11. Atomic sale works.
12. Stock cannot become negative.
13. Daily report is accurate.
14. Price snapshot works.
15. HPP snapshot works.
16. Gross profit is correctly labeled.
17. Realtime works across sessions.
18. Product archive works.
19. Void transaction works safely.
20. Stock movement audit works.
21. CSV export works.
22. Makassar timezone grouping works.
23. Owner/Admin permissions work.
24. Cashier permissions work.
25. RLS tested.
26. No service role key in browser.
27. No duplicate sales from double click.
28. No console errors.
29. No broken images.
30. No horizontal overflow.
31. 320px mobile works.
32. Build passes.
33. Lint passes.
34. Typecheck passes.
35. Tests pass.
36. Report all changed files and migrations.

---

# 62. FINAL RESPONSE FROM CODEX

After implementation provide:

## Architecture
Short explanation only.

## Created
List new files.

## Modified
List modified files.

## Supabase
List:
- tables
- migrations
- indexes
- RLS
- RPC functions
- seed data

## Product Seed
Show all 6 seeded products and prices.

## Routes
List routes.

## Performance Decisions
List concrete bundle/performance optimizations.

## Tests
Show actual status:
- build
- lint
- typecheck
- tests
- manual UAT

## Manual Configuration
Only list genuinely required manual actions.

Do not write a huge essay in final response.

---

# 63. NORTH STAR

The operational user is the EYFA owner/cashier.

Their experience should feel:

> **Scan. Input jumlah. Simpan. Selesai.**

Business outcome:

> **Penjualan tercatat, stok langsung berkurang, laporan otomatis terupdate, dan pemilik dapat melihat omzet, HPP, serta estimasi laba tanpa pencatatan manual berulang.**

Engineering principle:

# **Fast by default. Correct by design. Simple enough to use every day.**
