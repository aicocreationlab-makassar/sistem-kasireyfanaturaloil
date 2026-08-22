type SkeletonVariant = "cashier" | "dashboard" | "form" | "list" | "products" | "reports";

function Block({ height, width = "100%" }: { height: number; width?: string | number }) {
  return <div aria-hidden="true" style={{ width, height, borderRadius: 10, background: "var(--line)" }} />;
}

function PageHeadSkeleton() {
  return <div className="page-head">
    <div style={{ display: "grid", gap: 9 }}>
      <Block width={92} height={11} />
      <Block width={210} height={31} />
      <Block width="min(72vw, 340px)" height={13} />
    </div>
    <Block width={88} height={44} />
  </div>;
}

function MetricsSkeleton() {
  return <div className="grid metrics">
    {Array.from({ length: 4 }, (_, index) => <article className="card metric" key={index}>
      <Block width="55%" height={11} />
      <div style={{ marginTop: 17 }}><Block width="75%" height={25} /></div>
      <div style={{ marginTop: 10 }}><Block width="45%" height={9} /></div>
    </article>)}
  </div>;
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return <div className="card list">
    {Array.from({ length: rows }, (_, index) => <div className="list-item" key={index}>
      <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 8 }}>
        <Block width={`${Math.max(42, 76 - index * 4)}%`} height={14} />
        <Block width={`${Math.max(50, 88 - index * 3)}%`} height={10} />
      </div>
      <Block width={68} height={23} />
    </div>)}
  </div>;
}

function ProductGridSkeleton() {
  return <div className="grid product-grid">
    {Array.from({ length: 8 }, (_, index) => <article className="product-card card" key={index}>
      <div className="product-img" style={{ background: "var(--line)" }} />
      <div className="product-info" style={{ display: "grid", gap: 9 }}>
        <Block width="48%" height={20} />
        <Block width="86%" height={14} />
        <Block width="61%" height={17} />
        <Block width="100%" height={10} />
      </div>
    </article>)}
  </div>;
}

function FormSkeleton() {
  return <section className="card card-pad form-grid">
    {Array.from({ length: 5 }, (_, index) => <div style={{ display: "grid", gap: 8 }} key={index}>
      <Block width={index % 2 ? 118 : 86} height={11} />
      <Block height={46} />
    </div>)}
    <Block width={150} height={48} />
  </section>;
}

export function PageSkeleton({ variant = "list" }: { variant?: SkeletonVariant }) {
  return <main className="page motion-safe:animate-pulse" aria-busy="true" aria-label="Memuat halaman">
    <PageHeadSkeleton />
    {variant === "cashier" && <>
      <Block height={94} />
      <div className="section"><ProductGridSkeleton /></div>
    </>}
    {variant === "dashboard" && <>
      <MetricsSkeleton />
      <div className="split section">
        <section className="card card-pad"><Block height={150} /></section>
        <section className="card card-pad"><Block height={150} /></section>
      </div>
      <div className="section"><ListSkeleton rows={4} /></div>
    </>}
    {variant === "products" && <ProductGridSkeleton />}
    {variant === "list" && <ListSkeleton />}
    {variant === "form" && <FormSkeleton />}
    {variant === "reports" && <>
      <div className="filters"><Block width={82} height={38} /><Block width={82} height={38} /><Block width={82} height={38} /></div>
      <div className="section"><MetricsSkeleton /></div>
      <div className="section"><ListSkeleton rows={5} /></div>
    </>}
  </main>;
}
