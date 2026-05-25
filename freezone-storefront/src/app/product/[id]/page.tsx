const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

type Payload = {
  product?: { id: number; name: string; price: number; desc?: string };
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Payload = {};
  try {
    const res = await fetch(`${API}/api/ssr/product/${id}?locale=ar`, { next: { revalidate: 120 } });
    if (res.ok) data = await res.json();
  } catch {
    data = {};
  }
  const p = data.product;
  if (!p) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>منتج غير موجود</h1>
      </main>
    );
  }
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>{p.name}</h1>
      <p>{p.price.toLocaleString("ar-IQ")} IQD</p>
      {p.desc ? <div dangerouslySetInnerHTML={{ __html: p.desc }} /> : null}
    </main>
  );
}
